# 크롤러

Naver 모바일 뉴스 검색 결과에서 기사들을 크롤링해 `data/articles/` 와 같은 스키마(JSON)로 정리하는 파이썬 스크립트.

## 설치

```powershell
# (선택) venv 사용
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

## 환경변수

`OPENAI_API_KEY` 필수.

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

## 사용법

기본 (`config.json` 의 값 그대로):

```powershell
python crawl.py
```

CLI 플래그로 일부 값 덮어쓰기:

```powershell
# 키워드/개수 변경
python crawl.py --keyword 손흥민 --count 3

# 결과를 staging이 아니라 data/articles/로 바로 저장
python crawl.py --to-data

# 다른 config 파일 사용
python crawl.py --config my-config.json
```

## 동작

1. `https://m.search.naver.com/search.naver?...&query=<keyword>` 에서 검색 결과 페이지 fetch
2. **Naver 자체 호스팅 기사(`n.news.naver.com/mnews/article/...`)**만 골라 N개 수집
3. 각 기사:
   - 제목 / 본문 / 발행일 추출
   - 본문 안의 **캡션이 있는** 이미지만 다운로드해 `output/images/` (또는 `data/articles/images/`) 에 저장
   - OpenAI에 본문 보내서 텍스트 정리(요약 X) + 4-6개 태그 생성
   - 다음 ID (`YYYY-NNNN`) 발급해 JSON 저장

## 출력 위치

- `output: "staging"` (기본) → `크롤러/output/<id>.json`, 이미지는 `크롤러/output/images/`
- `output: "data"` 또는 `--to-data` → `data/articles/<id>.json`, 이미지는 `data/articles/images/`

## 설계 문서

[`docs/superpowers/specs/2026-06-08-naver-crawler-design.md`](../docs/superpowers/specs/2026-06-08-naver-crawler-design.md)
