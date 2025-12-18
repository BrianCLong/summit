export const config = {
  port: parseInt(process.env.PORT || '4010', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  version: process.env.npm_package_version || '1.0.0',

  cache: {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  },

  workloadTarget: {
    reductionPercent: 70,
  },
};
