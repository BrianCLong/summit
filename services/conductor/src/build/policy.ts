import { BuildTicket, PolicySpec } from "./schema";

const LICENSE_LABEL_MAP: Record<string, string> = {
  mit: "MIT-OK",
  apache: "Apache-2.0",
  proprietary: "Restricted",
};

export interface PolicyContext {
  defaultPurpose?: string;
  defaultRetention?: PolicySpec["retention"];
}

export function derivePolicy(ticket: BuildTicket, ctx: PolicyContext = {}): PolicySpec {
  const purpose = ctx.defaultPurpose || inferPurpose(ticket);
  const retention = inferRetention(ticket, ctx.defaultRetention);
  const licenseClass = inferLicenseClass(ticket);
  const pii = detectPii(ticket);

  return { purpose, retention, licenseClass, pii };
}

function inferPurpose(ticket: BuildTicket): string {
  if (ticket.labels?.some((l) => /security|cve/i.test(l))) return "security";
  if (/release/i.test(ticket.title)) return "release-management";
  if (/perf|latency|throughput/i.test(ticket.body)) return "performance";
  return "engineering";
}

function inferRetention(ticket: BuildTicket, fallback?: PolicySpec["retention"]): PolicySpec["retention"] {
  if (/pii|secret|privacy/i.test(ticket.body)) return "short-30d";
  if (ticket.labels?.some((l) => /audit|compliance/i.test(l))) return "extended";
  return fallback || "standard-365d";
}

function inferLicenseClass(ticket: BuildTicket): string {
  const label = ticket.labels?.find((l) => /mit|apache|proprietary/i.test(l));
  if (label) {
    for (const key of Object.keys(LICENSE_LABEL_MAP)) {
      if (label.toLowerCase().includes(key)) return LICENSE_LABEL_MAP[key];
    }
  }
  return "MIT-OK";
}

function detectPii(ticket: BuildTicket): boolean {
  if (/pii|personal data|ssn|pan/i.test(ticket.body)) return true;
  return ticket.labels?.some((l) => /pii|privacy/i.test(l)) ?? false;
}
