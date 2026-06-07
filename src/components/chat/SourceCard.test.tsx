import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { SourceCard } from "./SourceCard";

it("renders title, date and thumbnail when image exists", () => {
  render(<SourceCard source={{ id: "a1", title: "금리 인상", publishedDate: "2026-06-01", images: [{ filename: "x.jpg", caption: "c" }] }} />);
  expect(screen.getByText("금리 인상")).toBeInTheDocument();
  expect(screen.getByText("2026-06-01")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAttribute("src", "/api/images/x.jpg");
});
