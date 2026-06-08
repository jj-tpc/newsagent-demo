import { it, expect } from "vitest";
import { stripEmoji } from "./strip-emoji";

it("removes emoji while keeping Korean and ASCII intact", () => {
  expect(stripEmoji("안녕하세요 😀 반갑습니다")).toBe("안녕하세요  반갑습니다");
  expect(stripEmoji("Hello 🌟 world ✓")).toBe("Hello  world ");
});

it("removes dingbat / arrow / geometric symbols", () => {
  expect(stripEmoji("성공 ✓ 실패 ✕ 이동 → 별 ★")).toBe("성공  실패  이동  별 ");
});

it("removes flag emoji and ZWJ sequences", () => {
  expect(stripEmoji("국가 🇰🇷 이모지")).toBe("국가  이모지");
  // family emoji uses ZWJ; should be cleaned up fully
  expect(stripEmoji("가족 👨‍👩‍👧 이모지").trim()).toBe("가족  이모지");
});

it("is idempotent and safe on empty / plain strings", () => {
  expect(stripEmoji("")).toBe("");
  expect(stripEmoji("순수 한글과 영문 only")).toBe("순수 한글과 영문 only");
  expect(stripEmoji(stripEmoji("test 😀"))).toBe("test ");
});
