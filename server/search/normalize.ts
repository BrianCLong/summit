export function normalize(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFKC');
}
