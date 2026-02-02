export const FORBIDDEN_TERMS = ['admissible', 'compliant', 'fraud', 'guaranteed'];

export function lintContent(content: string): string[] {
  const violations: string[] = [];
  // Using a simpler approach for now: strictly checking for the presence of the word
  // surrounded by non-word characters or start/end of string.
  const lower = content.toLowerCase();

  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lower)) {
      violations.push(term);
    }
  }
  return violations;
}

export function lintObject(obj: any): string[] {
  // Convert to string and lint
  // This is a broad check, might catch keys or structural values.
  const str = JSON.stringify(obj);
  return lintContent(str);
}
