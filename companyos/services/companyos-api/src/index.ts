import express from "express";
import { disclosureExportGuard } from "./disclosure/export-guard";
import { exportDisclosurePackHandler } from "./disclosure/export-handler";
import { listDisclosurePacksHandler } from "./disclosure/disclosure-repo";

// Extend Express Request type with subject for auth context
declare global {
  namespace Express {
    interface Request {
      subject?: any;
    }
  }
}

const app = express();
const port = Number(process.env.PORT || 4100);

app.use(express.json());

app.use((req, _res, next) => {
  const rolesHeader = req.header("x-roles");
  const roles = rolesHeader ? rolesHeader.split(",").map((r) => r.trim()) : [];

  req.subject = {
    tenant_id: req.header("x-tenant-id") ?? req.query.tenant_id ?? "demo-tenant",
    roles,
    attributes: {
      region: req.header("x-region") ?? undefined,
      mfa_verified: req.header("x-mfa-verified") === "true"
    }
  };

  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/disclosure-packs", listDisclosurePacksHandler);
app.get(
  "/disclosure-packs/:id/export",
  disclosureExportGuard,
  exportDisclosurePackHandler
);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[companyos-api] listening on :${port}`);
  });
}

export default app;
