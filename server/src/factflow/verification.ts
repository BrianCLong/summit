import { Claim, Verdict, EvidenceItem } from "./types.js";

export interface VerificationEngine {
  verify(text: string): Promise<{ verdict: Verdict; confidence: number; evidence: EvidenceItem[] }>;
}

export class MockVerificationEngine implements VerificationEngine {
  async verify(text: string): Promise<{ verdict: Verdict; confidence: number; evidence: EvidenceItem[] }> {
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simple keyword-based mock verification
    if (text.includes("5%")) {
      return {
        verdict: "verified",
        confidence: 0.95,
        evidence: [
          {
            source: "Bureau of Economic Analysis",
            url: "https://example.com/bea",
            snippet: "GDP increased at an annual rate of 4.9 percent (approx 5%) in the third quarter.",
          },
        ],
      };
    } else if (text.includes("2%")) {
        return {
            verdict: "disputed",
            confidence: 0.70,
            evidence: [
                {
                    source: "Labor Bureau",
                    snippet: "Inflation remains at 3.2%."
                }
            ]
        }
    } else if (text.includes("record low")) {
         return {
            verdict: "verified",
            confidence: 0.9,
            evidence: [{ source: "BLS", snippet: "3.7% unemployment" }]
         }
    }

    return {
      verdict: "needs_review",
      confidence: 0.5,
      evidence: [],
    };
  }
}
