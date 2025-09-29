import { Router } from "express";
export default Router().get("/.well-known/jwks.json", (_req, res) => {
  // rotate via CI; keys[] contains active and next
  res.json({ keys: JSON.parse(process.env.RUNBOOK_JWKS_JSON || "[]") });
});
