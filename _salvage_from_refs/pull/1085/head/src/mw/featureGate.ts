// src/mw/featureGate.ts
export async function featureGate(feature: string) {
  return async (req, res, next) => {
    const r = await opaQuery("intelgraph/sku/allow_feature", { subject: req.user, feature });
    if (!r?.result) return res.status(403).json({ error: "feature_not_in_plan", feature });
    next();
  };
}
// Usage: app.post("/admin/qos/override", featureGate("qos.override"), handler)
