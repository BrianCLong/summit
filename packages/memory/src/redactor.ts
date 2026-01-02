export class Redactor {
  private patterns: RegExp[] = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, // Credit Card
  ];

  constructor(customPatterns: RegExp[] = []) {
    this.patterns = [...this.patterns, ...customPatterns];
  }

  redact(text: string): string {
    let redacted = text;
    for (const pattern of this.patterns) {
      // Ensure global flag if not present, though in JS/TS RegExp objects are stateful or immutable depending on context.
      // Easiest way to ensure global replacement is using split/join or replaceAll with a global regex.
      // If the user provided a regex without 'g', 'replace' only replaces the first one.
      // We can reconstruct the regex with 'g' if needed, but that's complex.
      // For now, we assume patterns are well-formed or use replaceAll if the pattern is a string (not here).
      // Best effort: usage of replace with a global regex.

      // If pattern has 'g' flag, replace will replace all.
      // If not, we can try to use a loop or just accept it replaces once.
      // Let's create a new RegExp with 'g' flag for every pattern to be safe.

      const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
      const globalPattern = new RegExp(pattern.source, flags);

      redacted = redacted.replace(globalPattern, '[REDACTED]');
    }
    return redacted;
  }
}
