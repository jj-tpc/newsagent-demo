"""Naver 모바일 뉴스 검색 결과 크롤러.

설계: docs/superpowers/specs/2026-06-08-naver-crawler-design.md
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode, urlparse

import requests
from bs4 import BeautifulSoup, Tag


SEARCH_URL = "https://m.search.naver.com/search.naver"

# Naver 자체 호스팅 기사 URL 패턴 (모바일/스포츠 포함)
NAVER_ARTICLE_PATTERNS = (
    re.compile(r"^https://n\.news\.naver\.com/(?:mnews/)?article/\d+/\d+"),
    re.compile(r"^https://m\.sports\.naver\.com/[^/]+/article/\d+/\d+"),
)


def _is_naver_article(url: str) -> bool:
    return any(p.match(url) for p in NAVER_ARTICLE_PATTERNS)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRAWLER_DIR = Path(__file__).resolve().parent
STAGING_DIR = CRAWLER_DIR / "output"
DATA_DIR = PROJECT_ROOT / "data" / "articles"


# ---------- config ----------

@dataclass
class Config:
    keyword: str
    count: int
    output: str  # "staging" | "data"
    openai_model: str
    request_delay_sec: float
    user_agent: str


def load_config(path: Path) -> Config:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    return Config(
        keyword=raw["keyword"],
        count=int(raw["count"]),
        output=raw.get("output", "staging"),
        openai_model=raw.get("openai_model", "gpt-5.4-mini"),
        request_delay_sec=float(raw.get("request_delay_sec", 1.0)),
        user_agent=raw.get(
            "user_agent",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        ),
    )


def resolve_target_dir(output_mode: str) -> Path:
    if output_mode == "data":
        return DATA_DIR
    if output_mode == "staging":
        return STAGING_DIR
    raise ValueError(f"output must be 'staging' or 'data', got: {output_mode!r}")


# ---------- ID generation ----------

ID_RE = re.compile(r"^(\d{4})-(\d{4})\.json$")


def next_id(target_dir: Path) -> str:
    """target_dir 안의 YYYY-NNNN.json 파일들에서 올해의 max(NNNN)+1을 만든다."""
    target_dir.mkdir(parents=True, exist_ok=True)
    year = date.today().year
    max_n = 0
    for entry in target_dir.iterdir():
        m = ID_RE.match(entry.name)
        if not m:
            continue
        if int(m.group(1)) != year:
            continue
        max_n = max(max_n, int(m.group(2)))
    return f"{year}-{max_n + 1:04d}"


# ---------- search ----------

def fetch_search_results(keyword: str, count: int, session: requests.Session, delay: float) -> list[str]:
    """검색 결과 페이지에서 n.news.naver.com 기사 링크들을 최대 count개 반환."""
    qs = urlencode({
        "ssc": "tab.m_news.all",
        "where": "m_news",
        "sm": "mtb_jum",
        "query": keyword,
    })
    url = f"{SEARCH_URL}?{qs}"
    print(f"[search] GET {url}")
    resp = session.get(url, timeout=15)
    resp.raise_for_status()
    time.sleep(delay)

    soup = BeautifulSoup(resp.text, "html.parser")
    urls: list[str] = []
    seen: set[str] = set()
    candidates: list[str] = []
    for a in soup.find_all("a", href=True):
        candidates.append(a["href"])
    for el in soup.find_all(attrs={"data-url": True}):
        candidates.append(el["data-url"])
    for href in candidates:
        if not _is_naver_article(href):
            continue
        clean = href.split("?", 1)[0].split("#", 1)[0]
        if clean in seen:
            continue
        seen.add(clean)
        urls.append(clean)
        if len(urls) >= count:
            break
    print(f"[search] found {len(urls)} naver-hosted article links (requested {count})")
    return urls


# ---------- article extraction ----------

@dataclass
class ArticleImage:
    src: str
    caption: str


@dataclass
class RawArticle:
    url: str
    title: str
    body_text: str
    published_date: str  # YYYY-MM-DD
    images: list[ArticleImage]  # captioned only


def _first_text(soup: BeautifulSoup, selectors: list[str]) -> str:
    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            txt = el.get_text(strip=True)
            if txt:
                return txt
    return ""


_DATE_TEXT_RE = re.compile(r"(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\.")


def _parse_date(soup: BeautifulSoup) -> str:
    # 1. 일반 뉴스 (n.news.naver.com): span에 data-date-time
    el = soup.select_one("span.media_end_head_info_datestamp_time[data-date-time]")
    if el and el.get("data-date-time"):
        raw = el["data-date-time"]
        try:
            return datetime.fromisoformat(raw.replace(" ", "T")).date().isoformat()
        except ValueError:
            pass
    # 2. 스포츠 (m.sports.naver.com): <em class="date">2026.06.08. 오전 4:25</em>
    em = soup.select_one("em.date")
    if em:
        m = _DATE_TEXT_RE.search(em.get_text(strip=True))
        if m:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            try:
                return date(y, mo, d).isoformat()
            except ValueError:
                pass
    # 3. meta fallback
    for prop in ("article:published_time", "og:published_time"):
        meta = soup.find("meta", attrs={"property": prop})
        if meta and meta.get("content"):
            raw = meta["content"]
            try:
                return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
            except ValueError:
                continue
    return date.today().isoformat()


def _find_body_container(soup: BeautifulSoup) -> Optional[Tag]:
    # 일반 뉴스 → #dic_area, 스포츠 → div._article_content, 그 외 fallback
    for sel in ("#dic_area", "div._article_content", "#newsct_article", "article"):
        el = soup.select_one(sel)
        if el:
            return el
    return None


def _extract_captioned_images(body: Tag) -> list[ArticleImage]:
    out: list[ArticleImage] = []
    for img in body.find_all("img"):
        src = img.get("data-src") or img.get("src")
        if not src:
            continue
        if src.startswith("data:"):
            continue
        if not src.startswith("http"):
            continue
        caption = _caption_near(img)
        if not caption:
            continue
        out.append(ArticleImage(src=src, caption=caption))
    return out


_CAPTION_SELECTORS = ("em.img_desc", "figcaption", "span.end_photo_org_desc")


def _caption_near(img: Tag) -> str:
    """img의 직속 컨테이너(figure/span 등) 안에서만 캡션을 찾는다.

    Naver 패턴: <span class="end_photo_org"><img/><em class="img_desc">caption</em></span>
    같은 부모 안에서만 찾아야 다른 이미지의 캡션과 섞이지 않는다.
    """
    parent = img.parent
    for _ in range(3):
        if parent is None or parent.name in ("body", "html", "[document]"):
            break
        # 컨테이너 안에 다른 img가 있으면 그건 묶음 부모이므로 더 좁혀야 함
        sibling_imgs = parent.find_all("img", recursive=True)
        if len(sibling_imgs) <= 1:
            for sel in _CAPTION_SELECTORS:
                el = parent.select_one(sel)
                if el:
                    txt = el.get_text(strip=True)
                    if txt:
                        return txt
        parent = parent.parent
    return ""


def fetch_article(url: str, session: requests.Session, delay: float) -> Optional[RawArticle]:
    print(f"[article] GET {url}")
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[article] FAILED fetch: {e}")
        return None
    time.sleep(delay)

    soup = BeautifulSoup(resp.text, "html.parser")
    title = _first_text(soup, [
        "h2.media_end_head_headline",
        "h2#title_area",
    ])
    if not title:
        og = soup.find("meta", attrs={"property": "og:title"})
        if og and og.get("content"):
            title = og["content"].strip()
    if not title:
        print(f"[article] FAILED title extract")
        return None

    body = _find_body_container(soup)
    if body is None:
        print(f"[article] FAILED body extract")
        return None

    body_text = body.get_text("\n", strip=True)
    if len(body_text) < 50:
        print(f"[article] body too short ({len(body_text)} chars)")
        return None

    images = _extract_captioned_images(body)
    published = _parse_date(soup)

    return RawArticle(
        url=url,
        title=title,
        body_text=body_text,
        published_date=published,
        images=images,
    )


# ---------- image download ----------

def download_image(url: str, target_path: Path, session: requests.Session, delay: float) -> bool:
    try:
        resp = session.get(url, timeout=15, stream=True)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[image] FAILED {url}: {e}")
        return False
    time.sleep(delay)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("wb") as f:
        for chunk in resp.iter_content(8192):
            if chunk:
                f.write(chunk)
    return True


def _extension_for(url: str, content_type: Optional[str]) -> str:
    if content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if ext:
            return ext
    path = urlparse(url).path
    suffix = Path(path).suffix
    if suffix:
        return suffix
    return ".jpg"


# ---------- LLM ----------

def llm_cleanup(body_text: str, keyword: str, model: str) -> Optional[dict]:
    """OpenAI 호출: 본문 정리 + 태그 생성. {'content': str, 'tags': list[str]} 반환."""
    from openai import OpenAI

    client = OpenAI()
    system_prompt = (
        "너는 신문 기사 정리 도우미다. 사용자가 제공한 기사 본문에서 "
        "본문 텍스트만 깔끔하게 정리해라. **요약하지 말고, 제목을 만들지 말고, "
        "기사 내용 자체를 보존**한다. 광고/구독 안내/'저작권자 ⓒ' 같은 보일러플레이트는 제거하고, "
        "줄바꿈은 자연스러운 단락 단위로 정리한다. "
        "그리고 본문을 보고 한국어 태그 4-6개를 뽑아라. "
        f"검색 키워드 '{keyword}' 자체는 태그에 포함하지 말 것."
    )
    user_prompt = f"기사 본문:\n\n{body_text}"

    schema = {
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "정리된 본문 텍스트"},
            "tags": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 4,
                "maxItems": 6,
            },
        },
        "required": ["content", "tags"],
        "additionalProperties": False,
    }

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "article_cleanup", "schema": schema, "strict": True},
            },
        )
    except Exception as e:
        print(f"[llm] FAILED: {e}")
        return None

    raw = resp.choices[0].message.content
    if not raw:
        print("[llm] empty response")
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[llm] JSON parse failed: {e}")
        return None


# ---------- main ----------

def process_one(
    raw: RawArticle,
    aid: str,
    target_dir: Path,
    config: Config,
    session: requests.Session,
) -> bool:
    cleaned = llm_cleanup(raw.body_text, config.keyword, config.openai_model)
    if cleaned is None:
        return False

    saved_images: list[dict] = []
    images_dir = target_dir / "images"
    for i, img in enumerate(raw.images):
        ext = _extension_for(img.src, None)
        filename = f"{aid}_{i}{ext}"
        target_path = images_dir / filename
        if download_image(img.src, target_path, session, config.request_delay_sec):
            saved_images.append({"filename": filename, "caption": img.caption})

    article = {
        "id": aid,
        "title": raw.title,
        "content": cleaned["content"],
        "images": saved_images,
        "publishedDate": raw.published_date,
        "tags": cleaned["tags"],
    }

    target_dir.mkdir(parents=True, exist_ok=True)
    out_path = target_dir / f"{aid}.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(article, f, ensure_ascii=False, indent=2)
    print(f"[save] {out_path}  (images: {len(saved_images)}, tags: {len(cleaned['tags'])})")
    return True


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Naver 모바일 뉴스 크롤러")
    parser.add_argument("--config", default=str(CRAWLER_DIR / "config.json"),
                        help="config.json 경로 (기본: 크롤러/config.json)")
    parser.add_argument("--keyword", help="검색 키워드 (config 값 덮어쓰기)")
    parser.add_argument("--count", type=int, help="가져올 기사 수 (config 값 덮어쓰기)")
    parser.add_argument("--to-data", action="store_true",
                        help="결과를 data/articles/ 로 바로 저장 (config의 output 무시)")
    args = parser.parse_args(argv)

    config = load_config(Path(args.config))
    if args.keyword is not None:
        config.keyword = args.keyword
    if args.count is not None:
        config.count = args.count
    if args.to_data:
        config.output = "data"

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY 환경변수가 필요합니다.", file=sys.stderr)
        return 1

    target_dir = resolve_target_dir(config.output)
    print(f"[config] keyword={config.keyword!r} count={config.count} "
          f"output={config.output} target={target_dir}")

    session = requests.Session()
    session.headers.update({
        "User-Agent": config.user_agent,
        "Accept-Language": "ko-KR,ko;q=0.9",
    })

    try:
        urls = fetch_search_results(config.keyword, config.count, session, config.request_delay_sec)
    except requests.RequestException as e:
        print(f"ERROR: 검색 페이지 fetch 실패: {e}", file=sys.stderr)
        return 1

    if not urls:
        print("경고: Naver 자체 호스팅 기사가 검색 결과에 없습니다.")
        return 0

    success = 0
    failed = 0
    for url in urls:
        raw = fetch_article(url, session, config.request_delay_sec)
        if raw is None:
            failed += 1
            continue
        aid = next_id(target_dir)
        if process_one(raw, aid, target_dir, config, session):
            success += 1
        else:
            failed += 1

    print(f"\n완료: 성공 {success}건, 실패 {failed}건, 저장 위치: {target_dir}")
    return 0 if success > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
