import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { USER_AGENT, PHOTO_BODY_AS_CAPTION_MAX } from "./constants";

export type RawArticleImage = { src: string; caption: string };

export type RawArticle = {
  url: string;
  title: string;
  bodyText: string;
  publishedDate: string;     // YYYY-MM-DD
  images: RawArticleImage[]; // 캡션 있는 이미지만
};

const TITLE_SELECTORS = ["h2.media_end_head_headline", "h2#title_area"] as const;
const BODY_SELECTORS = ["#dic_area", "div._article_content", "#newsct_article", "article"] as const;
const CAPTION_SELECTORS = ["em.img_desc", "figcaption", "span.end_photo_org_desc"] as const;

const DATE_TEXT_RE = /(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\./;

function firstText($: CheerioAPI, selectors: readonly string[]): string {
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length > 0) {
      const txt = el.text().trim();
      if (txt) return txt;
    }
  }
  return "";
}

function findBodyContainer($: CheerioAPI): Cheerio<Element> | null {
  for (const sel of BODY_SELECTORS) {
    const el = $(sel).first();
    if (el.length > 0) return el as Cheerio<Element>;
  }
  return null;
}

function parsePublishedDate($: CheerioAPI): string {
  // 일반 뉴스: span.media_end_head_info_datestamp_time[data-date-time]
  const span = $("span.media_end_head_info_datestamp_time").first();
  const raw = span.attr("data-date-time");
  if (raw) {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  // 스포츠: <em class="date">2026.06.08. 오전 ...</em>
  const em = $("em.date").first();
  if (em.length > 0) {
    const m = em.text().match(DATE_TEXT_RE);
    if (m) {
      const y = m[1];
      const mo = m[2].padStart(2, "0");
      const d = m[3].padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
  }
  // meta fallback
  for (const prop of ["article:published_time", "og:published_time"]) {
    const meta = $(`meta[property="${prop}"]`).first().attr("content");
    if (meta) {
      const date = new Date(meta);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeImgSrc($el: Cheerio<Element>): string | null {
  const candidates = ["data-src", "data-original", "data-lazy-src", "data-lazyload", "src"];
  let src: string | undefined;
  for (const a of candidates) {
    const v = $el.attr(a);
    if (v) { src = v; break; }
  }
  if (!src) return null;
  src = src.trim();
  if (!src || src.startsWith("data:")) return null;
  if (src.startsWith("//")) src = `https:${src}`;
  if (!src.startsWith("http")) return null;
  return src;
}

function captionNear($: CheerioAPI, img: Cheerio<Element>): string {
  // img의 가장 가까운 부모 컨테이너 안에서 캡션을 찾는다.
  // 컨테이너 안에 다른 img 도 같이 있으면 그 컨테이너는 묶음 부모 — 더 좁혀야 함.
  let parent = img.parent();
  for (let depth = 0; depth < 3; depth += 1) {
    if (parent.length === 0) break;
    const tag = (parent[0] as Element).tagName?.toLowerCase();
    if (tag === "body" || tag === "html") break;
    const siblingImgs = parent.find("img").length;
    if (siblingImgs <= 1) {
      for (const sel of CAPTION_SELECTORS) {
        const cap = parent.find(sel).first();
        if (cap.length > 0) {
          const txt = cap.text().trim();
          if (txt) return txt;
        }
      }
    }
    parent = parent.parent();
  }
  return "";
}

function extractCaptionedImages($: CheerioAPI, body: Cheerio<Element>): RawArticleImage[] {
  const captioned: RawArticleImage[] = [];
  const uncaptionedSrcs: string[] = [];
  body.find("img").each((_, el) => {
    const $img = $(el);
    const src = normalizeImgSrc($img);
    if (!src) return;
    const caption = captionNear($, $img);
    if (caption) {
      captioned.push({ src, caption });
    } else {
      uncaptionedSrcs.push(src);
    }
  });
  // 포토기사 fallback: 캡션 selector에 안 잡힌 이미지가 정확히 1장이고
  // 본문이 사진 한 줄 설명 정도(<= PHOTO_BODY_AS_CAPTION_MAX)면 본문을 캡션으로
  if (captioned.length === 0 && uncaptionedSrcs.length === 1) {
    const bodyText = body.text().replace(/\s+/g, " ").trim();
    if (bodyText && bodyText.length <= PHOTO_BODY_AS_CAPTION_MAX) {
      captioned.push({ src: uncaptionedSrcs[0], caption: bodyText });
    }
  }
  return captioned;
}

export async function fetchArticle(url: string): Promise<RawArticle | null> {
  let resp: Response;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12_000);  // 12s fetch timeout
  try {
    resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: ac.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) return null;
  const html = await resp.text();
  const $ = cheerio.load(html);

  let title = firstText($, TITLE_SELECTORS);
  if (!title) title = $("meta[property=\"og:title\"]").attr("content")?.trim() ?? "";
  if (!title) return null;

  const body = findBodyContainer($);
  if (!body) return null;
  const bodyText = body.text().replace(/\n\s*\n/g, "\n").replace(/^\s+|\s+$/g, "");
  if (bodyText.length < 50) return null;

  const images = extractCaptionedImages($, body);
  const publishedDate = parsePublishedDate($);

  return { url, title, bodyText, publishedDate, images };
}
