import { createHash } from "crypto";

export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalJson(item)).join(",") + "]";
  }

  const keys = Object.keys(obj).sort();
  const sortedParts = keys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalJson(obj[key]);
  });
  return "{" + sortedParts.join(",") + "}";
}

export function buildEvidenceId(input: any, report: any): string {
  const data = canonicalJson({ input, report });
  return createHash("sha256").update(data).digest("hex");
}
