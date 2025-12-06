import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics
const queryLatency = new Trend('graphql_query_duration');

// Load the golden dataset
// Note: This path is relative to the script file execution location (usually repo root if run via npm script)
// or relative to this file depending on k6 version/context.
// Assuming execution from repo root: k6 run k6/golden-path-benchmark.js
const dataset = JSON.parse(open('../data/golden-path/demo-investigation.json'));

export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Warm up with 5 users
    { duration: '30s', target: 20 }, // Load test with 20 users
    { duration: '10s', target: 0 },  // Cool down
  ],
  thresholds: {
    // Goal: 95th percentile query time < 100ms
    'graphql_query_duration': ['p(95)<100'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

export function setup() {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }

  // 1. Create Investigation
  const createInvMutation = `
    mutation CreateInvestigation($input: CreateInvestigationInput!) {
      createInvestigation(input: $input) {
        id
      }
    }
  `;

  const invRes = http.post(BASE_URL, JSON.stringify({
    query: createInvMutation,
    variables: {
      input: {
        name: `Benchmark ${dataset.investigation.name} ${Date.now()}`,
        description: dataset.investigation.description,
        type: dataset.investigation.type || 'THREAT_ANALYSIS',
      }
    }
  }), { headers });

  const invBody = JSON.parse(invRes.body);
  if (invBody.errors) {
    throw new Error(`Setup failed (CreateInvestigation): ${JSON.stringify(invBody.errors)}`);
  }

  const investigationId = invBody.data.createInvestigation.id;
  console.log(`Setup: Created benchmark investigation ${investigationId}`);

  // 2. Add Entities
  const createdEntityIds = [];
  const addEntityMutation = `
    mutation AddEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
      }
    }
  `;

  for (const entity of dataset.entities) {
    const res = http.post(BASE_URL, JSON.stringify({
      query: addEntityMutation,
      variables: {
        input: {
          investigationId,
          type: entity.type,
          name: entity.name,
          properties: entity.properties
        }
      }
    }), { headers });

    const body = JSON.parse(res.body);
    if (body.errors) {
      console.error(`Setup warning: Failed to add entity ${entity.name}: ${JSON.stringify(body.errors)}`);
      createdEntityIds.push(null); // Keep index alignment
    } else {
      createdEntityIds.push(body.data.createEntity.id);
    }
  }

  // 3. Add Relationships
  if (dataset.relationships && dataset.entities) {
    const addRelMutation = `
      mutation AddRelationship($input: CreateRelationshipInput!) {
        createRelationship(input: $input) {
          id
        }
      }
    `;

    for (const rel of dataset.relationships) {
      const fromId = createdEntityIds[rel.from];
      const toId = createdEntityIds[rel.to];

      if (fromId && toId) {
        const res = http.post(BASE_URL, JSON.stringify({
          query: addRelMutation,
          variables: {
            input: {
              investigationId,
              type: rel.type,
              fromEntityId: fromId,
              toEntityId: toId,
              properties: rel.properties
            }
          }
        }), { headers });

        const body = JSON.parse(res.body);
        if (body.errors) {
          console.error(`Setup warning: Failed to add relationship ${rel.type}: ${JSON.stringify(body.errors)}`);
        }
      } else {
         console.warn(`Skipping relationship due to missing entity IDs: ${rel.from} -> ${rel.to}`);
      }
    }
  }

  return { investigationId };
}

export default function (data) {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }

  // Query to fetch the investigation and its graph (entities/relationships)
  // This hits Neo4j via the IntelGraphService
  const query = `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        name
        entities {
          id
          type
          name
        }
        relationships {
          id
          type
          fromEntityId
          toEntityId
        }
      }
    }
  `;

  const res = http.post(BASE_URL, JSON.stringify({
    query: query,
    variables: { id: data.investigationId }
  }), { headers });

  let body;
  try {
    body = JSON.parse(res.body);
  } catch (e) {
    body = {};
  }

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'no graphql errors': (r) => !body.errors,
    'has data': (r) => body.data && body.data.investigation,
  });

  if (success) {
    queryLatency.add(res.timings.duration);
  }

  sleep(1);
}
