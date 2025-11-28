import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const DUMMY_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlciIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.Q_R-K-d_3E_V-A-C-K-E-R';

const pollForQueryResult = async (request, query, condition, maxRetries = 20, interval = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await request.post('http://localhost:4000/graphql', { data: { query } });
      if (response.ok()) {
        const body = await response.json();
        if (condition(body)) {
          return true;
        }
      }
    } catch (error) {
      console.log(`Polling attempt ${i + 1} failed: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
};

test.describe('Golden Path E2E', () => {

  test.beforeAll(() => {
    console.log('Starting services for E2E test...');
    execSync('make up');
    console.log('Waiting for services to be healthy...');
    execSync(`
      RETRY_COUNT=0
      MAX_RETRIES=45
      until $(curl --output /dev/null --silent --head --fail http://localhost:4000/health); do
          if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
              echo "API service did not start in time. Aborting."
              execSync('make down');
              exit 1
          fi
          printf '.'
          RETRY_COUNT=$(($RETRY_COUNT+1))
          sleep 2
      done
    `);
    console.log('Services are healthy.');
    console.log('Triggering ENTITY data ingest...');
    execSync(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${DUMMY_JWT}" -d '{"source": "golden/entities.csv", "type": "entities"}' http://localhost:4000/api/ingest/push`);
  });

  test('should return ingested data and relationships correctly', async ({ request }) => {
    // 1. Poll until entities are searchable
    const entityQuery = '{ searchEntities(q: "Acme", tenant: "default-tenant") { ... on Org { name } } }';
    const entityCondition = (body) => body.data.searchEntities && body.data.searchEntities.some(e => e.name === 'Acme Corporation');
    const entitiesFound = await pollForQueryResult(request, entityQuery, entityCondition);
    expect(entitiesFound).toBeTruthy();

    // 2. Once entities are found, trigger edge ingest
    console.log('Entities found. Triggering EDGE data ingest...');
    execSync(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${DUMMY_JWT}" -d '{"source": "golden/edges.csv", "type": "edges"}' http://localhost:4000/api/ingest/push`);

    // 3. Poll until the relationship (neighbor) is searchable
    const neighborQuery = '{ neighbors(id: "1", tenant: "default-tenant") { ... on Org { name } } }';
    const neighborCondition = (body) => body.data.neighbors && body.data.neighbors.some(n => n.name === 'Acme Corporation');
    const neighborFound = await pollForQueryResult(request, neighborQuery, neighborCondition);
    expect(neighborFound).toBeTruthy();
  });

  test.afterAll(() => {
    console.log('Tearing down services...');
    execSync('make down');
  });
});
