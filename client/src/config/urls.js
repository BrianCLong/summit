import {
  VITE_API_BASE_URL,
  VITE_API_URL,
  VITE_GRAFANA_URL,
  VITE_JAEGER_URL,
  VITE_WS_URL,
} from './env.js';

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');
const stripGraphqlPath = (value) => value.replace(/\/graphql\/?$/, '');
const ensurePath = (base, path) =>
  `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
const getWindowOrigin = () => {
  if (typeof window === 'undefined') return '';
  const { origin, protocol, host } = window.location || {};
  if (origin) return normalizeBaseUrl(origin);
  if (!host) return '';
  return normalizeBaseUrl(`${protocol}//${host}`);
};

export const getApiBaseUrl = () => {
  const envBase = VITE_API_BASE_URL || VITE_API_URL;
  if (envBase) return normalizeBaseUrl(stripGraphqlPath(envBase));
  return getWindowOrigin();
};

export const getGraphqlHttpUrl = () => {
  const envUrl = VITE_API_URL || VITE_API_BASE_URL;
  if (envUrl) {
    if (/\/graphql\/?$/.test(envUrl)) return normalizeBaseUrl(envUrl);
    return ensurePath(envUrl, '/graphql');
  }
  const base = getWindowOrigin();
  return base ? ensurePath(base, '/graphql') : '';
};

export const getSocketBaseUrl = () => {
  if (VITE_WS_URL) return normalizeBaseUrl(VITE_WS_URL);
  const base = getWindowOrigin();
  if (!base) return '';
  const wsProtocol = base.startsWith('https:') ? 'wss:' : 'ws:';
  return `${wsProtocol}//${base.replace(/^https?:\/\//, '')}`;
};

export const getGraphqlWsUrl = () => {
  if (VITE_WS_URL) {
    if (/\/graphql\/?$/.test(VITE_WS_URL)) return normalizeBaseUrl(VITE_WS_URL);
    return ensurePath(VITE_WS_URL, '/graphql');
  }
  const httpUrl = getGraphqlHttpUrl();
  if (!httpUrl) return '';
  return httpUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
};

export const getGrafanaUrl = () =>
  VITE_GRAFANA_URL ? normalizeBaseUrl(VITE_GRAFANA_URL) : '';

export const getJaegerUrl = () =>
  VITE_JAEGER_URL ? normalizeBaseUrl(VITE_JAEGER_URL) : '';
