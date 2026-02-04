/**
 * Centralized environment configuration.
 * This file is a .js file so it can be transformed by Babel in Jest environment,
 * resolving 'import.meta' syntax errors that ts-jest (in CommonJS mode) cannot handle.
 */

export const VITE_API_URL = import.meta.env.VITE_API_URL || '';
export const VITE_WS_URL = import.meta.env.VITE_WS_URL || '';
export const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const VITE_GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || '';
export const VITE_GRAFANA_MAESTRO_DASH_UID = import.meta.env.VITE_GRAFANA_MAESTRO_DASH_UID || '';
export const VITE_PERF_MODE = import.meta.env.VITE_PERF_MODE;
export const VITE_DEMO_MODE = import.meta.env.VITE_DEMO_MODE;
export const VITE_ASSISTANT_TRANSPORT = import.meta.env.VITE_ASSISTANT_TRANSPORT;
export const VITE_API_BASE = import.meta.env.VITE_API_BASE;
export const VITE_FEATURE_FLAGS = import.meta.env.VITE_FEATURE_FLAGS;
export const VITE_TENANT_ID = import.meta.env.VITE_TENANT_ID;
export const VITE_SHOW_EVENTS = import.meta.env.VITE_SHOW_EVENTS;
export const VITE_COST_PREVIEW = import.meta.env.VITE_COST_PREVIEW;
export const VITE_JAEGER_URL = import.meta.env.VITE_JAEGER_URL;
export const VITE_ROLLOUTS_API = import.meta.env.VITE_ROLLOUTS_API;
export const VITE_PROM_URL = import.meta.env.VITE_PROM_URL;
export const VITE_POLICY_API = import.meta.env.VITE_POLICY_API;
export const VITE_PROV_API = import.meta.env.VITE_PROV_API;
export const VITE_NL2CYPHER_API = import.meta.env.VITE_NL2CYPHER_API;
export const VITE_OBS_GRAFANA_URL = import.meta.env.VITE_OBS_GRAFANA_URL;
export const VITE_OBS_TEMPO_URL = import.meta.env.VITE_OBS_TEMPO_URL;
export const VITE_OBS_PROM_URL = import.meta.env.VITE_OBS_PROM_URL;
export const VITE_OBS_EMBED = import.meta.env.VITE_OBS_EMBED;
export const VITE_RELATIONSHIP_GQL = import.meta.env.VITE_RELATIONSHIP_GQL;
export const MODE = import.meta.env.MODE;
export const DEV = import.meta.env.DEV;
export const PROD = import.meta.env.PROD;
export const SSR = import.meta.env.SSR;

/**
 * Dynamic access helper (transformed by Babel in tests)
 */
export const getEnv = (key) => {
  try {
    return import.meta.env[key];
  } catch {
    return undefined;
  }
};
