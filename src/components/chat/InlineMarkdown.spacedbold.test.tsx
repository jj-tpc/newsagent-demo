import { render } from "@testing-library/react";
import { it, expect } from "vitest";
import { InlineMarkdown } from "./InlineMarkdown";

const cases: [string, string, string][] = [
  ["both sides spaced", "이것은 ** 굵게 ** 입니다.", "굵게"],
  ["leading space", "이것은 ** 굵게** 입니다.", "굵게"],
  ["trailing space", "이것은 **굵게 ** 입니다.", "굵게"],
  ["multi word spaced", "결론: ** 홍명보 감독 ** 의 변화.", "홍명보 감독"],
  ["two spaced bolds keep separate", "** 첫째 ** 그리고 ** 둘째 ** 끝.", "첫째"],
];

for (const [name, input, expected] of cases) {
  it(`spaced bold: ${name}`, () => {
    const { container } = render(<InlineMarkdown text={input} />);
    const strongs = Array.from(container.querySelectorAll("strong")).map((e) => e.textContent);
    expect(strongs, `input=${JSON.stringify(input)} got=${JSON.stringify(strongs)}`).toContain(expected);
  });
}

it("does not merge two separate spaced bolds into one", () => {
  const { container } = render(<InlineMarkdown text={"** 첫째 ** 그리고 ** 둘째 ** 끝."} />);
  const strongs = Array.from(container.querySelectorAll("strong")).map((e) => e.textContent);
  expect(strongs).toEqual(["첫째", "둘째"]);
});
