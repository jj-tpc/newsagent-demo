import * as cheerio from "cheerio";
import { USER_AGENT } from "./constants";

const SEARCH_URL = "https://m.search.naver.com/search.naver";

// Naver 자체 호스팅 기사 URL 패턴
const NAVER_ARTICLE_PATTERNS = [
  /^https:\/\/n\.news\.naver\.com\/(?:mnews\/)?article\/\d+\/\d+/,
  /^https:\/\/m\.sports\.naver\.com\/[^/]+\/article\/\d+\/\d+/,
] as const;

function isNaverArticle(url: string): boolean {
  return NAVER_ARTICLE_PATTERNS.some((p) => p.test(url));
}

/** 검색 결과 페이지에서 Naver 자체 호스팅 기사 URL 들을 최대 count개 반환 */
export async function fetchSearchResults(keyword: string, count: number): Promise<string[]> {
  const qs = new URLSearchParams({
    ssc: "tab.m_news.all",
    where: "m_news",
    sm: "mtb_jum",
    query: keyword,
  });
  const url = `${SEARCH_URL}?${qs.toString()}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
  });
  if (!resp.ok) {
    throw new Error(`search HTTP ${resp.status}`);
  }
  const html = await resp.text();
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: string[] = [];

  // href 와 data-url 양쪽에서 후보 수집
  const candidates: string[] = [];
  $("a[href]").each((_, el) => { candidates.push($(el).attr("href") ?? ""); });
  $("[data-url]").each((_, el) => { candidates.push($(el).attr("data-url") ?? ""); });

  for (const href of candidates) {
    if (!isNaverArticle(href)) continue;
    const clean = href.split("?")[0].split("#")[0];
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= count) break;
  }
  return out;
}
