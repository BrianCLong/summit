// Deterministic prompt compression scaffold
export function optimizePrompt(text: string, strategy: "aggressive" | "lossless" = "lossless"): string {
  if (strategy === "aggressive") {
    // Remove stop words (mock)
    return text.replace(/\b(the|a|an|is|are|was|were)\b/gi, "").replace(/\s+/g, " ").trim();
  }
  return text.trim();
}
