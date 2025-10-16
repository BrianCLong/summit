// Minimal proxy to Typesense multi-search returning title/path/snippet
export default async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  if (!q) return res.status(200).json([]);
  // TODO: call Typesense search; for now, return empty
  return res.status(200).json([]);
};
