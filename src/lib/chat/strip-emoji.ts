// 흔히 LLM 답변에 섞이는 이모지 / 장식 유니코드 기호를 제거한다.
// 변형 셀렉터(VS16) + ZWJ + skin tone 까지 함께 잘라낸다.
const EMOJI_RE = new RegExp(
  [
    "[\u{1F300}-\u{1F6FF}]",    // misc symbols & pictographs
    "[\u{1F700}-\u{1F77F}]",    // alchemical
    "[\u{1F780}-\u{1F7FF}]",    // geometric shapes ext
    "[\u{1F800}-\u{1F8FF}]",    // sup arrows-c
    "[\u{1F900}-\u{1F9FF}]",    // supplemental symbols & pictographs
    "[\u{1FA00}-\u{1FA6F}]",
    "[\u{1FA70}-\u{1FAFF}]",
    "[\u{2190}-\u{21FF}]",      // arrows (← ↑ → ↓ ↔ 등)
    "[\u{2300}-\u{23FF}]",      // technical
    "[\u{2600}-\u{27BF}]",      // misc symbols + dingbats (★ ☆ ☞ ✓ ✕ 등 포함)
    "[\u{2B00}-\u{2BFF}]",      // sup arrows + misc symbols
    "[\u{1F1E6}-\u{1F1FF}]",    // regional indicators (flags)
    "[\u{FE0F}]",                // variation selector
    "[\u{200D}]",                // zwj
    "[\u{20E3}]",                // combining enclosing keycap
  ].join("|"),
  "gu",
);

export function stripEmoji(text: string): string {
  if (!text) return text;
  return text.replace(EMOJI_RE, "");
}
