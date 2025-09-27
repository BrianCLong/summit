export function ensureReadOnly(cypher: string) {
  const disallowed = /\b(create|merge|delete|set|apoc\.|load csv)\b/i;
  if (disallowed.test(cypher)) {
    throw new Error('write_operation_not_allowed');
  }
  return true;
}
