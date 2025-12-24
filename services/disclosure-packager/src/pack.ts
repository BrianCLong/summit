export function buildHtml({ title, manifestB64 }: { title: string; manifestB64: string }) {
  return `<!doctype html><html><body><h1>${title}</h1><p>Manifest (b64): ${manifestB64.slice(0, 32)}...</p></body></html>`;
}
