import { configService } from './ConfigService.js';

// Deprecated: Use configService instead
const config = {
  env: configService.get('app').env,
  port: configService.get('app').port,
  requireRealDbs: configService.get('app').requireRealDbs,
  neo4j: configService.get('neo4j'),
  postgres: configService.get('postgres'),
  redis: configService.get('redis'),
  jwt: {
    secret: configService.get('auth').jwtSecret,
    expiresIn: configService.get('auth').jwtExpiresIn,
    refreshSecret: configService.get('auth').refreshSecret,
    refreshExpiresIn: configService.get('auth').refreshExpiresIn,
  },
  bcrypt: {
    rounds: configService.get('auth').bcryptRounds,
  },
  rateLimit: {
    // These weren't in the main config object, let's keep defaults or add to ConfigService if needed
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000)),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  cors: {
    origin: configService.get('app').corsOrigin,
  },
  features: {
    GRAPH_EXPAND_CACHE: configService.isFeatureEnabled('GRAPH_EXPAND_CACHE'),
    AI_REQUEST_ENABLED: configService.isFeatureEnabled('AI_REQUEST_ENABLED'),
  },
};

export default config;
