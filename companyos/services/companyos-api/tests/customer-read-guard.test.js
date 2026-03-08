"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const nock_1 = __importDefault(require("nock"));
const identity_middleware_1 = require("../src/authz/identity-middleware");
const customer_read_guard_1 = require("../src/authz/customer-read-guard");
describe("customerReadGuard", () => {
    const OPA_PATH = "/v1/data/companyos/authz/customer/decision";
    function buildApp() {
        const app = (0, express_1.default)();
        app.use(identity_middleware_1.stubIdentity);
        app.get("/tenants/:tenantId/customers/:id", customer_read_guard_1.customerReadGuard, (req, res) => {
            res.json({ id: req.params.id, tenant_id: req.params.tenantId });
        });
        return app;
    }
    beforeEach(() => {
        nock_1.default.cleanAll();
        process.env.OPA_URL = `http://opa-test.local${OPA_PATH}`;
    });
    it("allows when OPA returns allow=true", async () => {
        (0, nock_1.default)("http://opa-test.local")
            .post(OPA_PATH)
            .reply(200, { result: { allow: true, reason: "tenant_role_ok" } });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .get("/tenants/tenant_demo/customers/cust_1")
            .set("x-user-id", "user_1")
            .set("x-roles", "compliance_lead");
        expect(res.status).toBe(200);
        expect(res.body.id).toBe("cust_1");
    });
    it("denies when OPA returns allow=false", async () => {
        (0, nock_1.default)("http://opa-test.local")
            .post(OPA_PATH)
            .reply(200, { result: { allow: false, reason: "not_in_tenant" } });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .get("/tenants/other_tenant/customers/cust_1")
            .set("x-user-id", "user_1")
            .set("x-roles", "viewer");
        expect(res.status).toBe(403);
        expect(res.body.error).toBe("forbidden");
    });
});
