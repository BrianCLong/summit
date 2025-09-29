export type MaestroConfig = {
  gatewayBase?: string; // e.g., http://localhost:4000/api/maestro/v1
  grafanaBase?: string; // e.g., http://localhost:3000
  grafanaDashboards?: { slo?: string; overview?: string; cost?: string };
  authToken?: string; // optional bearer
};

export function getMaestroConfig(): MaestroConfig {
  // Allow runtime injection via global var (no build step required)
  const g: any = (window as any).__MAESTRO_CFG__ || {};
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
