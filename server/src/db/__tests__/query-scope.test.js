"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_scope_js_1 = require("../query-scope.js");
describe("validateAndScopeQuery", () => {
    const tenantId = "tenant-123";
    it("scopes a simple SELECT query", () => {
        const result = (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs", [], tenantId);
        expect(result.wasScoped).toBe(true);
        expect(result.query).toBe("SELECT * FROM audit_logs WHERE tenant_id = $1");
        expect(result.params).toEqual([tenantId]);
    });
    it("scopes a SELECT query with WHERE clause", () => {
        const result = (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs WHERE id = $1", ["log-1"], tenantId);
        expect(result.wasScoped).toBe(true);
        expect(result.query).toBe("SELECT * FROM audit_logs WHERE id = $1 AND tenant_id = $2");
        expect(result.params).toEqual(["log-1", tenantId]);
    });
    it("strips trailing semicolons before scoping", () => {
        const result = (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs;", [], tenantId);
        expect(result.wasScoped).toBe(true);
        expect(result.query).toBe("SELECT * FROM audit_logs WHERE tenant_id = $1");
        expect(result.params).toEqual([tenantId]);
    });
    it("strips trailing semicolons with whitespace", () => {
        const result = (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs;  ", [], tenantId);
        expect(result.wasScoped).toBe(true);
        expect(result.query).toBe("SELECT * FROM audit_logs WHERE tenant_id = $1");
        expect(result.params).toEqual([tenantId]);
    });
    it("throws error for queries with comments (--) that need scoping", () => {
        expect(() => {
            (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs -- comment", [], tenantId);
        }).toThrow(/Unsafe query for auto-scoping/);
    });
    it("throws error for queries with comments (/* */) that need scoping", () => {
        expect(() => {
            (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM audit_logs /* comment */", [], tenantId);
        }).toThrow(/Unsafe query for auto-scoping/);
    });
    it("throws error for already scoped queries with comments", () => {
        const query = "SELECT * FROM audit_logs WHERE tenant_id = $1 -- comment";
        expect(() => {
            (0, query_scope_js_1.validateAndScopeQuery)(query, [tenantId], tenantId);
        }).toThrow(/Unsafe query for auto-scoping/);
    });
    it("throws error for maliciously crafted already scoped queries with comments", () => {
        const query = "SELECT * FROM audit_logs -- bypass scoping and tenant_id = $1";
        expect(() => {
            (0, query_scope_js_1.validateAndScopeQuery)(query, ["bypass_id"], tenantId);
        }).toThrow(/Unsafe query for auto-scoping/);
    });
    it("ignores queries that do not touch tenant-scoped tables", () => {
        const result = (0, query_scope_js_1.validateAndScopeQuery)("SELECT * FROM public_data", [], tenantId);
        expect(result.wasScoped).toBe(false);
        expect(result.query).toBe("SELECT * FROM public_data");
    });
});
