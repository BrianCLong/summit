import process from 'node:process';

const url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const username = process.env.ELASTICSEARCH_USERNAME || 'elastic';
const password = process.env.ELASTICSEARCH_PASSWORD || 'changeme';

async function ensureIndex() {
  const response = await fetch(`${url}/summit-events`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 1 },
      mappings: {
        properties: {
          investigationId: { type: 'keyword' },
          title: { type: 'text' },
          tags: { type: 'keyword' },
          updatedAt: { type: 'date' }
        }
      }
    })
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(`Failed to ensure index: ${response.status} ${await response.text()}`);
  }
}

async function indexDocument() {
  const payload = {
    investigationId: 'demo-investigation-001',
    title: 'Suspicious payment triangulation',
    tags: ['finance', 'aml', 'graph'],
    updatedAt: new Date().toISOString()
  };

  const response = await fetch(`${url}/summit-events/_doc`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to index document: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  console.log(`Indexed document with ID: ${body._id}`);
}

async function main() {
  await ensureIndex();
  await indexDocument();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
