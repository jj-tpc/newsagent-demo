# Naver 뉴스 크롤러 (Python) — 설계 (Design Spec)

- 작성일: 2026-06-08
- 상태: 초안 (사용자 승인 완료)
- 선행 없음 (Next.js 앱과 독립적인 Python 스크립트)

## 1. 목적 / 개요

프로젝트 루트에 `크롤러/` 디렉토리를 만들고, 네이버 뉴스 검색 결과로부터 기사들을
크롤링하여 기존 `data/articles/<id>.json` 스키마에 맞춰 저장하는 파이썬 스크립트를
만든다. 본문 텍스트 정리와 태그 생성에 LLM(OpenAI)을 사용한다.

기준 검색 URL:
`https://m.search.naver.com/search.naver?ssc=tab.m_news.all&where=m_news&sm=mtb_jum&query=<keyword>`

## 2. 디렉토리 구조

```
크롤러/
├── config.json          # 크롤링 설정
├── crawl.py             # 메인 스크립트
├── requirements.txt     # python 의존성
├── output/              # staging 출력 (기본). images/ 하위 포함
│   ├── images/
│   └── <id>.json
└── README.md            # 사용법 + 환경변수 안내
```

`크롤러/output/`은 git 추적 대상 아님 (`.gitignore`에 추가). 단, `output/.gitkeep`은 유지.

## 3. config.json 스키마

```json
{
  "keyword": "홍명보",
  "count": 5,
  "output": "staging",
  "openai_model": "gpt-5.4-mini",
  "request_delay_sec": 1.0,
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
}
```

- `output`: `"staging"` (→ `크롤러/output/`) 또는 `"data"` (→ `data/articles/`)
- `openai_model`: 호출할 OpenAI 모델
- `request_delay_sec`: 요청 사이 sleep (네이버에 부담 줄이기)
- `user_agent`: 모바일 UA 권장 (m.search.naver.com 응답이 모바일 페이지로 옴)

## 4. CLI

```
python crawl.py [--keyword K] [--count N] [--to-data] [--config PATH]
```

- 모든 인자는 옵션. 주어지면 config 값을 덮어씀.
- `--to-data`: config의 `output`을 무시하고 `data/articles/`로 강제.
- `--config`: 기본 `크롤러/config.json`.

## 5. 파이프라인 (단계별)

### 5.1 검색 결과 페이지 크롤링

- `requests.get(BASE_URL + urlencode({query: keyword}), headers={UA})`
- 응답 HTML에서 검색 결과 카드 N개 추출 (BeautifulSoup)
- 각 카드에서 추출할 것: `n.news.naver.com` 으로 시작하는 기사 링크
- **외부 언론사 페이지 링크는 무시.** Naver 자체 호스팅 페이지(`n.news.naver.com/mnews/article/...`)만 대상.
- 카드의 Naver 링크가 없으면 그 카드는 skip
- 목표 개수(`count`) 채워질 때까지 카드 순회. 부족하면 부족한 채로 반환 (경고 로그).

### 5.2 기사 페이지 크롤링 (Naver 자체 호스팅)

URL 예: `https://n.news.naver.com/mnews/article/<press>/<articleId>`

추출 대상 selector (모바일 페이지 기준 - 변경 가능성 있으므로 폴백 chain):
- 제목: `h2.media_end_head_headline` (fallback: `h2#title_area`, `meta[property="og:title"]`)
- 본문 영역: `#dic_area` (fallback: `#newsct_article`, `article`)
- 발행일: `span.media_end_head_info_datestamp_time[data-date-time]` 의 `data-date-time` 속성
  - fallback: `meta[property="article:published_time"]`
  - YYYY-MM-DD 로 정규화
- 본문 내 이미지: 본문 영역 안의 `<img>` 태그
  - 각 이미지의 캡션: 인접 형제 `<em class="img_desc">` (fallback: 같은 `<figure>` 안의 `<figcaption>`)
  - 캡션 없는 이미지는 skip (사용자 요구사항: 캡션 필수)

### 5.3 이미지 다운로드

- 본문 안에서 캡션이 있는 이미지만 대상
- 각 이미지 URL에서 다운로드 → `<output_dir>/images/<id>_<i>.<ext>` 로 저장
  - `<i>`는 0부터 시작하는 인덱스
  - 확장자는 Content-Type 또는 URL 끝에서 추론 (jpg/png/gif/webp 등)
- 다운로드 실패한 이미지는 skip (해당 이미지만 건너뜀, 기사 자체는 계속)
- JSON의 `images[]` 에는 `{ filename, caption }` 만 기록 (디렉토리 prefix 없음)

### 5.4 LLM 호출 (OpenAI)

- 환경변수 `OPENAI_API_KEY` 필수. 없으면 즉시 실패.
- 입력: BeautifulSoup으로 본문 영역에서 추출한 raw text + 검색 키워드 (맥락)
- structured output (function calling / json_schema) 으로 다음 응답 받음:
  ```json
  {
    "content": "정리된 본문 텍스트",
    "tags": ["태그1", "태그2", "..."]
  }
  ```
- 시스템 프롬프트 요지:
  - 본문 텍스트를 깔끔하게 정리(불필요한 공백/광고/구독 안내 제거)
  - **요약하지 말 것, 제목 재작성하지 말 것**. 본문 내용 자체를 보존
  - 4-6개의 한국어 태그 추출 (검색 키워드 자체는 태그에 포함하지 않음)
- 1 article = 1 API call

### 5.5 ID 발급

- target dir 스캔 → `^\d{4}-\d{4}\.json$` 패턴 매칭
- 현재 연도(`YYYY`) 의 가장 큰 NNNN 찾아 +1
- 현재 연도 항목이 없으면 `YYYY-0001` 부터
- (예: `data/articles/`에 `2026-0001`, `2026-0002`, `2026-0003`이 있으면 다음은 `2026-0004`)
- target dir이 `staging`이면 staging 내 기존 ID를, `data`면 `data/articles/` 의 ID를 기준으로 +1

### 5.6 JSON 저장

```json
{
  "id": "2026-0004",
  "title": "<naver 페이지에서 추출한 제목 그대로>",
  "content": "<LLM이 정리한 본문>",
  "images": [{ "filename": "2026-0004_0.jpg", "caption": "..." }],
  "publishedDate": "2026-06-05",
  "tags": ["축구", "감독", "..."]
}
```

- `json.dump(..., ensure_ascii=False, indent=2)`

## 6. 에러 처리 / 로깅

- 검색 결과 페이지 fetch 실패 / 응답 코드 비정상(429, 5xx) → 종료 (exit 1)
- 검색 결과에 Naver 자체 호스팅 링크 0개 → 경고 후 0건 처리로 종료
- 개별 기사 추출 실패 (네트워크/parse) → 해당 기사만 skip, 로그 남기고 다음 진행
- LLM 호출 실패 → 해당 기사만 skip
- 마지막에 요약 출력: `완료: 성공 X건, 실패 Y건, 저장 위치: <path>`

stdout 에 단순 print 로 로그. 별도 로깅 프레임워크 사용 안 함.

## 7. 의존성 (requirements.txt)

```
requests>=2.31
beautifulsoup4>=4.12
openai>=1.0
```

표준 라이브러리: `json`, `os`, `re`, `time`, `urllib.parse`, `argparse`, `pathlib`, `datetime`, `mimetypes`.

## 8. 보안 / 윤리

- 모든 HTTP GET 요청(검색 페이지 / 기사 페이지 / 이미지) 사이 `request_delay_sec` (기본 1초) sleep
- `User-Agent` 명시 (모바일 브라우저 흉내)
- 네이버 robots.txt 위반하지 않는 검색 결과 페이지만 대상
- API 키는 환경변수로만 받음 — 코드/config에 하드코딩 금지

## 9. 비범위 (Out of scope)

- 중복 기사 탐지(같은 url 또는 같은 제목 재크롤링 방지) — 단순히 ID만 +1
- 자동 스케줄링 (cron / systemd) — 수동 실행 전제
- 다중 키워드 / 검색 옵션(기간, 정렬 등) — 단일 키워드만
- Next.js 앱과의 통합 (예: admin 페이지에서 트리거하는 버튼) — 별도 작업
- 네이버 selector 변경 자동 감지 / 셀프 힐링
