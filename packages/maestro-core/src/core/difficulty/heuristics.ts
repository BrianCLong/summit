const DOMAIN_KEYWORDS: Array<{ domain: string; re: RegExp }> = [
  { domain: "code", re: /\b(code|bug|typescript|python|compile|stack trace|regex|api|sdk)\b/i },
  { domain: "math", re: /\b(prove|derive|integral|probability|expected value|theorem|lemma)\b/i },
  { domain: "legal", re: /\b(legal|contract|liability|gdpr|hipaa|sox|compliance|regulation)\b/i },
  { domain: "security", re: /\b(cve|exploit|threat model|xss|csrf|rce|malware|phishing)\b/i },
  { domain: "osint", re: /\b(osint|attribution|timeline|sources|corroborate|verify)\b/i },
];

export function detectDomain(query: string, contextHint?: string): string {
  const text = `${query}\n${contextHint ?? ""}`.slice(0, 50_000);
  for (const { domain, re } of DOMAIN_KEYWORDS) if (re.test(text)) return domain;
  return "general";
}

export function extractDifficultyFeatures(query: string): Record<string, number> {
  const q = query ?? "";
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  const len = q.length;
  const wordCount = tokens.length;

  const verbs = (q.match(/\b(analyze|compare|synthesize|evaluate|design|implement|optimi[sz]e|prove|debug)\b/gi) ?? []).length;
  const constraints = (q.match(/\b(must|should|cannot|avoid|required|acceptance criteria|test|benchmark)\b/gi) ?? []).length;

  const hasLists = /(\n-|\n\d+\.)/.test(q) ? 1 : 0;
  const hasCode = /```|function\s*\(|class\s+\w+|import\s+.+from/.test(q) ? 1 : 0;
  const hasMultiStep = /\b(step|phase|roadmap|plan|milestone|pr\s*\d+)\b/i.test(q) ? 1 : 0;

  // crude entropy proxy: more unique tokens & punctuation tends to correlate with complexity
  const uniqueRatio = wordCount > 0 ? new Set(tokens.map(t => t.toLowerCase())).size / wordCount : 0;
  const punctuationDensity = len > 0 ? (q.match(/[,:;()[\]{}]/g) ?? []).length / len : 0;

  return {
    len,
    wordCount,
    verbs,
    constraints,
    hasLists,
    hasCode,
    hasMultiStep,
    uniqueRatio,
    punctuationDensity,
  };
}

export function scoreDifficultyFromFeatures(f: Record<string, number>): number {
  // Normalize-ish inputs
  const lenScore = Math.min(f.len / 1500, 1);          // long prompts → harder
  const wordScore = Math.min(f.wordCount / 250, 1);
  const verbScore = Math.min(f.verbs / 6, 1);
  const constraintScore = Math.min(f.constraints / 10, 1);

  const structureBonus = 0.12 * (f.hasLists ?? 0) + 0.18 * (f.hasMultiStep ?? 0);
  const codeBonus = 0.20 * (f.hasCode ?? 0);

  const varietyBonus = 0.15 * Math.min(f.uniqueRatio ?? 0, 1);
  const punctBonus = 0.10 * Math.min((f.punctuationDensity ?? 0) * 20, 1);

  // Weighted sum
  const raw =
    0.22 * lenScore +
    0.18 * wordScore +
    0.18 * verbScore +
    0.12 * constraintScore +
    structureBonus +
    codeBonus +
    varietyBonus +
    punctBonus;

  return Math.max(0, Math.min(raw, 1));
}

export function recommendedDepth(score: number): number {
  // 1..6
  if (score < 0.20) return 1;
  if (score < 0.40) return 2;
  if (score < 0.60) return 3;
  if (score < 0.75) return 4;
  if (score < 0.90) return 5;
  return 6;
}
