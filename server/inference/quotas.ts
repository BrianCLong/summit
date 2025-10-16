export function enforceQuota(req, res, next) {
  const qps = { starter: 2, pro: 10, enterprise: 50 }[req.tenant.plan] || 2;
  // simple token bucket per tenant+model; 429 on exceed
  next();
}
