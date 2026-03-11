import { describe, it, expect } from "vitest";
import { parseMarkdown } from "@/lib/markdown";

describe("markdown", () => {
  it("renders bold text", () => {
    expect(parseMarkdown("**hello**")).toBe("<strong>hello</strong>");
  });

  it("renders italic text", () => {
    expect(parseMarkdown("*hello*")).toBe("<em>hello</em>");
  });

  it("escapes HTML", () => {
    expect(parseMarkdown("<script>")).toBe("&lt;script&gt;");
  });

  it("returns empty string for empty input", () => {
    expect(parseMarkdown("")).toBe("");
  });
});