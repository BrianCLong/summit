export interface DisinfoCheckResult {
  risk_level: "low" | "medium" | "high";
  flags: string[];
}

export function checkDisinfoRisk(
  body: string,
  isOfficial: boolean,
  mediaHash?: string
): DisinfoCheckResult {
  const flags: string[] = [];
  let risk_level: "low" | "medium" | "high" = "low";

  if (!isOfficial && body.includes("breaking")) {
    flags.push("unofficial_breaking");
    risk_level = "medium";
  }

  // Basic mock check for recycled media.
  if (mediaHash === "RECYCLED_HASH_123") {
    flags.push("recycled_media");
    risk_level = "high";
  }

  return { risk_level, flags };
}
