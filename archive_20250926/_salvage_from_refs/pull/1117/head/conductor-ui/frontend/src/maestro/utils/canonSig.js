export function canonSig(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '{hex}')
    .replace(/\b\d{3,}\b/g, '{num}')
    .replace(/timeout after \d+ms/g, 'timeout after {num}ms')
    .replace(/at .+:\d+:\d+/g, 'at {file}:{num}:{num}')
    .slice(0, 200);
}
