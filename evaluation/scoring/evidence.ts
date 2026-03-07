export function scoreEvidence(required: string[], provided: string[]) {
  if (required.length === 0) return 1;
  const hits = required.filter(id => provided.includes(id)).length;
  return hits / required.length;
}
