import { OPAClient } from '../opa-client'; // Mocked

describe('GraphQL Policy Contract Tests', () => {
  const opaClient = new OPAClient();

  it("should DENY access when a user queries for another tenant's data", async () => {
    const input = {
      principal: { tenant_id: 'tenant-a' },
      resource: { tenant_id: 'tenant-b' },
    };
    const decision = await opaClient.query(input);
    expect(decision.allow).toBe(false);
  });

  it("should ALLOW access when a user queries for their own tenant's data", async () => {
    const input = {
      principal: { tenant_id: 'tenant-a' },
      resource: { tenant_id: 'tenant-a' },
    };
    const decision = await opaClient.query(input);
    expect(decision.allow).toBe(true);
  });
});
