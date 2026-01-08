const destructiveOverridePattern = /APPROVED_DESTRUCTIVE_CHANGE:\s*[A-Za-z0-9_-]+/i;

export function hasOverride(content: string): boolean {
  return destructiveOverridePattern.test(content);
}

export function stripSqlComments(sql: string): string {
  const withoutBlock = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlock
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
