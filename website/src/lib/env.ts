/**
 * Environment configuration utilities
 */
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://topicality.co',
  analyticsMode: process.env.NEXT_PUBLIC_ANALYTICS_MODE ?? 'none',
  analyticsEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? '/api/analytics',
  environment: process.env.NEXT_PUBLIC_ENV ?? 'local',
} as const;

export const isProduction = env.environment === 'production';
export const isDevelopment = env.environment === 'development' || env.environment === 'local';
