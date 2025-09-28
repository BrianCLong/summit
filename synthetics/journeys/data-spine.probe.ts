import { test, expect, APIRequestContext } from '@playwright/test';

const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || 'http://localhost:3000';

async function publishSchema(request: APIRequestContext, subject: string) {
  const response = await request.post(`${REGISTRY_URL}/schemas/${encodeURIComponent(subject)}/versions`, {
    data: {
      type: 'avro',
      schema: {
        type: 'record',
        name: 'SyntheticProbe',
        fields: [
          { name: 'id', type: 'string', 'x-tags': ['key'] },
          { name: 'email', type: 'string', pii: true, default: '' }
        ]
      }
    }
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.version;
}

test.describe('Data Spine probes', () => {
  test('schema registry publish + validate roundtrip', async ({ request }) => {
    const subject = `synthetic-${Date.now()}`;
    const version = await publishSchema(request, subject);
    expect(version).toMatch(/\d+\.\d+\.\d+/);

    const validateResponse = await request.post(`${REGISTRY_URL}/schemas/${encodeURIComponent(subject)}/validate`, {
      data: {
        type: 'avro',
        schema: {
          type: 'record',
          name: 'SyntheticProbe',
          fields: [
            { name: 'id', type: 'string', 'x-tags': ['key'] },
            { name: 'email', type: 'string', pii: true, default: '' },
            { name: 'country', type: 'string', default: 'US' }
          ]
        }
      }
    });
    expect(validateResponse.ok()).toBeTruthy();
    const validation = await validateResponse.json();
    expect(validation.compatibility.compatible).toBeTruthy();
  });
});
