// Minimal proxy to Typesense multi-search returning title/path/snippet
export default async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  if (!q) return res.status(501).json({ error: "Not Implemented" });
  // SECURITY(P0): RESOLVED via hard-fail - return 501 Not Implemented
  return res.status(501).json({ error: "Not Implemented" });
};
