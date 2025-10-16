export interface MaestroConfig {
  gatewayBase?: string; // e.g., http://localhost:4000/api/maestro/v1
  grafanaBase?: string; // e.g., http://localhost:3000
  grafanaDashboards?: { slo?: string; overview?: string; cost?: string };
  authToken?: string; // optional bearer
}

interface MaestroConfigGlobal {
  gatewayBase?: string;
  grafanaBase?: string;
  grafanaDashboards?: { slo?: string; overview?: string; cost?: string };
  authToken?: string;
}

export function getMaestroConfig(): MaestroConfig {
  // Allow runtime injection via global var (no build step required)
  const g: MaestroConfigGlobal =
    (
      window as Window &
        typeof globalThis & { __MAESTRO_CFG__?: MaestroConfigGlobal }
    ).__MAESTRO_CFG__ || {};
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
