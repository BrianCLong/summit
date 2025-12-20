import fs from "node:fs";

// Minimal classifier: map scanner signatures -> class IDs.
// Later: load rules from yaml and add confidence scoring.

type Finding = { tool: string; ruleId?: string; title: string; url?: string; cwe?: string };
type Classified = Finding & { vulnClass: string; confidence: number };

const RULES: Array<{ match: (f: Finding) => boolean; vulnClass: string; confidence: number }> = [
  { match: f => (f.tool === "zap" && /xss/i.test(f.title)), vulnClass: "ZAP-XSS-REFLECTED", confidence: 0.8 },
  // ...
];

export function classify(findings: Finding[]): Classified[] {
  return findings.map(f => {
    const hit = RULES.find(r => r.match(f));
    return { ...f, vulnClass: hit?.vulnClass ?? "UNCLASSIFIED", confidence: hit?.confidence ?? 0.1 };
  });
}

if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(process.argv[2]!, "utf8"));
  const out = classify(input);
  process.stdout.write(JSON.stringify(out, null, 2));
}
