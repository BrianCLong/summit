import { BlockCheck } from './types.js';

const BLOCKLIST = [
  /\bCREATE\b/i,
  /\bMERGE\b/i,
  /\bDELETE\b/i,
  /\bDETACH\b/i,
  /\bSET\b/i,
  /\bDROP\b/i,
  /\bCALL\s+dbms\./i,
  /apoc\./i,
  /LOAD\s+CSV/i,
  /COPY\s+INTO/i,
];

export function sanitizeCypher(cypher: string): { cleaned: string; warnings: string[] } {
  let cleaned = cypher.replace(/;+/g, '').trim();
  const warnings: string[] = [];

  BLOCKLIST.forEach((pattern) => {
    if (pattern.test(cleaned)) {
      warnings.push(`Blocked pattern: ${pattern}`);
      cleaned = cleaned.replace(pattern, '/* blocked */');
    }
  });

  return { cleaned, warnings };
}

export function isBlocked(cypher: string): BlockCheck {
  const reasons = BLOCKLIST.filter((pattern) => pattern.test(cypher)).map((p) =>
    `Rejected because it matches ${p}`,
  );
  return { blocked: reasons.length > 0, reasons };
}
