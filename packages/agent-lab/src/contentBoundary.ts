import crypto from "crypto";

export interface BoundedContent {
  text: string;
  truncated: boolean;
  hash: string;
  redactions: string[];
  tags: string[];
}

const injectionPhrases = [
  "ignore previous instructions",
  "override safety",
  "exfiltrate",
  "leak secret",
  "disable policy",
];

const secretPattern = /(api|private)?\s*(key|token|secret|password)\b/gi;
const envPattern = /[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD)/g;

export class ContentBoundary {
  constructor(private readonly maxLength = 2000) {}

  markUntrusted(raw: unknown): BoundedContent {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    const redactions: string[] = [];
    let cleaned = text;

    injectionPhrases.forEach((phrase) => {
      const regex = new RegExp(phrase, "gi");
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, "[blocked-directive]");
        redactions.push(`blocked:${phrase}`);
      }
    });

    const secretMatches = cleaned.match(secretPattern) || [];
    if (secretMatches.length > 0) {
      redactions.push("secret-phrase");
      cleaned = cleaned.replace(secretPattern, "[redacted-secret]");
    }

    const envMatches = cleaned.match(envPattern) || [];
    if (envMatches.length > 0) {
      redactions.push("env-name");
      cleaned = cleaned.replace(envPattern, "[redacted-env]");
    }

    const hash = crypto.createHash("sha256").update(cleaned).digest("hex");
    let truncated = false;
    let bounded = cleaned;

    if (cleaned.length > this.maxLength) {
      truncated = true;
      const head = cleaned.slice(0, this.maxLength);
      bounded = `${head}\n...[truncated:${cleaned.length - this.maxLength} chars]\nsha256:${hash}`;
    }

    return {
      text: bounded,
      truncated,
      hash,
      redactions,
      tags: ["UNTRUSTED"],
    };
  }
}

export const defaultBoundary = new ContentBoundary();
