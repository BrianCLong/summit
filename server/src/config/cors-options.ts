import type { CorsOptions } from 'cors';
import { cfg } from '../config.js';

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'x-tenant-id',
  'x-correlation-id',
  'x-trace-id',
];

const DEFAULT_EXPOSED_HEADERS = ['x-request-id', 'x-correlation-id'];

type MinimalEnv = Pick<typeof cfg, 'CORS_ORIGIN' | 'NODE_ENV'>;

export const buildCorsOptions = (env: MinimalEnv = cfg): CorsOptions => {
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin: any) => origin.trim())
    .filter(Boolean);
  const isProd = env.NODE_ENV === 'production';

  return {
    origin: (origin: any, callback) => {
      if (!origin) return callback(null, true);
      if (!isProd) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`Origin ${origin} not allowed by Summit CORS policy`),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    exposedHeaders: DEFAULT_EXPOSED_HEADERS,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
};

