export class OPAClient {
  constructor() {}
  async evaluate() { return true; }
  async query(input: { principal: { tenant_id: string }; resource: { tenant_id: string } }) {
    // Tenant isolation: allow only if principal and resource belong to same tenant
    return { allow: input.principal.tenant_id === input.resource.tenant_id };
  }
}
