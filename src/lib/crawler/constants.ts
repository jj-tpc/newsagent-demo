export const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** HTTP 요청 사이 짧은 sleep — Vercel 60s 한도 안에 안전하게 5건 처리하기 위해 작게. */
export const REQUEST_DELAY_MS = 200;

/** 본문 = 캡션 fallback 발동 한도 */
export const PHOTO_BODY_AS_CAPTION_MAX = 350;
