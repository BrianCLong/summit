import request from 'supertest';

// This test assumes a running GraphQL server at the specified URL.
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_URL || 'http://localhost:3001/graphql';

// Example asset IDs belonging to different tenants.
const ASSET_ID_TENANT_A = 'asset-owned-by-tenant-a'; // Assume this asset is owned by tenant-A
const ASSET_ID_TENANT_B = 'asset-owned-by-tenant-b'; // Assume this asset is owned by tenant-B

describe('GraphQL Tenant Isolation Fuzz Test', () => {
  const query = `
    query GetDataAsset($id: ID!) {
      dataAsset(id: $id) {
        id
        # In a real test, you might query for tenant_id if the schema permits it
      }
    }
  `;

  it('should allow access to an asset belonging to the correct tenant', async () => {
    const response = await request(GRAPHQL_ENDPOINT)
      .post('')
      .set('X-Tenant-Id', 'tenant-A') // Set header for tenant A
      .send({ query, variables: { id: ASSET_ID_TENANT_A } });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.dataAsset).not.toBeNull();
    expect(response.body.data.dataAsset.id).toBe(ASSET_ID_TENANT_A);
  });

  it('should deny access to an asset belonging to a different tenant', async () => {
    const response = await request(GRAPHQL_ENDPOINT)
      .post('')
      .set('X-Tenant-Id', 'tenant-A') // Set header for tenant A
      .send({ query, variables: { id: ASSET_ID_TENANT_B } }); // Request asset from tenant B

    expect(response.status).toBe(200);
    // The RLS policy should ensure no data is returned.
    // Depending on resolver implementation, it might return null or an error.
    if (response.body.errors) {
      expect(response.body.errors[0].message).toMatch(/policy|tenant|not found/i);
    } else {
      expect(response.body.data.dataAsset).toBeNull();
    }
  });

  it('should deny access if the tenant header is missing', async () => {
    const response = await request(GRAPHQL_ENDPOINT)
      .post('')
      // No X-Tenant-Id header
      .send({ query, variables: { id: ASSET_ID_TENANT_A } });

    expect(response.status).toBe(200);
    // Expect an error because the 'app.tenant_id' setting will not be set in the DB session.
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toMatch(/tenant/i);
  });
});
