import express from "express";
import { customerReadGuard } from "./authz/customer-read-guard";
import { stubIdentity } from "./authz/identity-middleware";
import { validateRequest } from "./middleware/contract-validator";
import { ApiContracts } from "./contracts/api";
import { ResidencyService } from "./routing/residency-service";

const app = express();
const port = Number(process.env.PORT ?? 4100);

app.use(express.json());
app.use(stubIdentity);

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/livez", (_req, res) => res.json({ ok: true }));

app.get(
  "/tenants/:tenantId/customers/:id",
  validateRequest({ params: ApiContracts.getCustomer.params }),
  customerReadGuard,
  (req, res) => {
    const residencyService = ResidencyService.getInstance();
    const region = residencyService.resolveRegion(req.params.tenantId, "customer");
    const storage = residencyService.getStorageSelector(req.params.tenantId, "customer");

    res.json({
      id: req.params.id,
      tenant_id: req.params.tenantId,
      name: "Demo Customer",
      region: region,
      storage_node: storage,
    });
  },
);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[companyos-api] listening on :${port}`);
  });
}

export default app;
