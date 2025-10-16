#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = parseInt(process.env.MOCK_SERVICE_PORT || '4010', 10);
const fixtureRoot = path.resolve(
  __dirname,
  '..',
  '..',
  'ops',
  'devkit',
  'fixtures',
);
const datasetPath = path.join(fixtureRoot, 'datasets.json');
const graphPath = path.join(fixtureRoot, 'graph.json');

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read fixture ${filePath}:`, error);
    return null;
  }
}

const datasets = loadJson(datasetPath) || {
  datasets: [],
  personas: [],
  cases: [],
};
const graph = loadJson(graphPath) || { nodes: [], relationships: [] };

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function findDataset(name) {
  return datasets.datasets?.find(
    (entry) => entry.slug === name || entry.name === name,
  );
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  if (pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      datasets: datasets.datasets?.length || 0,
      personas: datasets.personas?.length || 0,
      cases: datasets.cases?.length || 0,
      graphNodes: graph.nodes?.length || 0,
      graphRelationships: graph.relationships?.length || 0,
      timestamp: Date.now(),
    });
    return;
  }

  if (pathname === '/mock/datasets') {
    sendJson(res, 200, datasets.datasets || []);
    return;
  }

  if (pathname.startsWith('/mock/datasets/')) {
    const slug = pathname.split('/').pop();
    const entry = findDataset(slug);
    if (!entry) {
      sendJson(res, 404, { error: 'dataset_not_found', slug });
      return;
    }
    sendJson(res, 200, entry);
    return;
  }

  if (pathname === '/mock/personas') {
    sendJson(res, 200, datasets.personas || []);
    return;
  }

  if (pathname === '/mock/cases') {
    sendJson(res, 200, datasets.cases || []);
    return;
  }

  if (pathname === '/mock/graph') {
    sendJson(res, 200, graph);
    return;
  }

  sendJson(res, 404, { error: 'not_found', path: pathname });
});

server.listen(port, () => {
  console.log(`Mock services listening on http://localhost:${port}`);
});
