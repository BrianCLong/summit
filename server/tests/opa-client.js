"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAClient = void 0;
class OPAClient {
    constructor() { }
    async evaluate() { return true; }
    async query(input) {
        // Tenant isolation: allow only if principal and resource belong to same tenant
        return { allow: input.principal.tenant_id === input.resource.tenant_id };
    }
}
exports.OPAClient = OPAClient;
