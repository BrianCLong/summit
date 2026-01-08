import { describe, expect, it } from "vitest";
import { buildOsintMappingSuggestions } from "../src/osint-mapping.js";

describe("osint mapping wizard", () => {
  it("flags PII fields", () => {
    const suggestions = buildOsintMappingSuggestions({
      title: "Sample report",
      link: "https://example.com",
      contact: "analyst@example.com",
    });
    const pii = suggestions.find((suggestion) => suggestion.field === "contact");
    expect(pii?.piiWarning).toBe("email");
  });
});
