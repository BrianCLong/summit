"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customer_read_guard_1 = require("./authz/customer-read-guard");
const identity_middleware_1 = require("./authz/identity-middleware");
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 4100);
app.use(express_1.default.json());
app.use(identity_middleware_1.stubIdentity);
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/livez", (_req, res) => res.json({ ok: true }));
app.get("/tenants/:tenantId/customers/:id", customer_read_guard_1.customerReadGuard, (req, res) => {
    res.json({
        id: req.params.id,
        tenant_id: req.params.tenantId,
        name: "Demo Customer",
        region: req.header("x-resource-region") ?? "us",
    });
});
if (process.env.NODE_ENV !== "test") {
    app.listen(port, () => {
        console.log(`[companyos-api] listening on :${port}`);
    });
}
exports.default = app;
