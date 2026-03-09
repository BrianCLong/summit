export function recordDecisionAdmission({
  profile,
  outcome,
  durationMs,
}: {
  profile: string;
  outcome: "allow" | "deny";
  durationMs: number;
}) {
  // Mock recording metrics
  return { profile, outcome, durationMs };
}
