import { it, expect } from "vitest";
import { getProvider } from "./index";

it("throws on unknown provider", () => {
  // @ts-expect-error invalid name
  expect(() => getProvider("nope")).toThrow();
});
it("returns a provider object with required methods", () => {
  const p = getProvider("anthropic");
  expect(typeof p.selectArticles).toBe("function");
  expect(typeof p.answer).toBe("function");
});
