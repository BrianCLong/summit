import process from 'node:process';

const sourceUrl = process.env.SOURCE_URL || 'https://jsonplaceholder.typicode.com/posts?_limit=5';
const graphqlUrl = process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';
const token = process.env.GRAPHQL_TOKEN || 'dev-token';

const mutation = `
mutation UpsertExternalEntities($input: [ExternalEntityInput!]!) {
  upsertExternalEntities(input: $input) {
    id
    externalId
    name
    updatedAt
  }
}
`;

async function fetchPage() {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source data: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function toEntityInput(records) {
  return records.map((record) => ({
    externalId: `json-api-${record.id}`,
    name: record.title ?? 'untitled',
    description: record.body ?? '',
    attributes: [{ key: 'source', value: sourceUrl }, { key: 'topic', value: 'demo' }]
  }));
}

async function sendBatch(entities) {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query: mutation, variables: { input: entities } })
  });

  if (!response.ok) {
    throw new Error(`GraphQL error: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  if (body.errors) {
    console.error(body.errors);
    throw new Error('GraphQL reported errors');
  }

  return body.data.upsertExternalEntities;
}

async function main() {
  const records = await fetchPage();
  const entities = toEntityInput(records);

  const batches = [];
  const batchSize = 3;
  for (let i = 0; i < entities.length; i += batchSize) {
    batches.push(entities.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const start = performance.now();
    const result = await sendBatch(batch);
    const durationMs = Math.round(performance.now() - start);
    console.log(`Upserted ${result.length} entities in ${durationMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
