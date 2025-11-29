import express from "express";
import { customerReadGuard } from "./authz/customer-read-guard";
import { stubIdentity } from "./authz/identity-middleware";

const app = express();
const port = Number(process.env.PORT ?? 4100);

app.use(express.json());
app.use(stubIdentity);

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/livez", (_req, res) => res.json({ ok: true }));

app.get("/tenants/:tenantId/customers/:id", customerReadGuard, (req, res) => {
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

export default app;
