const fs = require('fs');
const Typesense = require('typesense');
const corpus = JSON.parse(
  fs.readFileSync('docs/ops/search/corpus.json', 'utf8'),
);
const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST,
      port: process.env.TYPESENSE_PORT || 443,
      protocol: process.env.TYPESENSE_PROTOCOL || 'https',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5,
});
(async () => {
  const name = process.env.TYPESENSE_COLLECTION || 'intelgraph_docs';
  try {
    await client.collections(name).retrieve();
  } catch {
    await client.collections().create({
      name,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'path', type: 'string', facet: false },
        { name: 'title', type: 'string' },
        { name: 'summary', type: 'string' },
        { name: 'version', type: 'string', facet: true },
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'sections', type: 'string[]' },
      ],
      default_sorting_field: 'title',
    });
  }
  const docs = corpus.map((r) => ({
    id: r.id,
    path: r.path,
    title: r.title,
    summary: r.summary,
    version: r.version,
    tags: r.tags,
    sections: r.sections.map((s) => `${s.h}: ${s.text}`),
  }));
  await client.collections(name).documents().import(docs, { action: 'upsert' });
  console.log('Ingested', docs.length);
})();
