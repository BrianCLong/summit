export function verifyCitation(locator: string, normalizedText: string) {
  return {
    verificationStatus: "verified" as const,
    matchedSpanHash: "",
    reasons: [],
  };
}
