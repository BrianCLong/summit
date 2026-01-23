import { cfg } from '../config.js';

export const env = {
  DOCLING_SVC_URL: cfg.DOCLING_SVC_URL,
  DOCLING_SVC_TIMEOUT_MS: cfg.DOCLING_SVC_TIMEOUT_MS,
  CORS_ORIGIN: cfg.CORS_ORIGIN,
  NODE_ENV: cfg.NODE_ENV,
  PORT: cfg.PORT,
};
