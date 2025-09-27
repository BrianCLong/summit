export function getMaestroConfig() {
  // Allow runtime injection via global var (no build step required)
  const g = window.__MAESTRO_CFG__ || {};
  return {
    gatewayBase: g.gatewayBase,
    grafanaBase: g.grafanaBase,
    grafanaDashboards: g.grafanaDashboards || {
      slo: 'maestro-slo',
      overview: 'maestro-overview',
      cost: 'maestro-cost',
    },
    authToken: g.authToken,
  };
}
export function authHeaders(cfg = getMaestroConfig()) {
  return cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {};
}
