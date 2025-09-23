import { z } from 'zod';
const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().default('3000'),
    JWKS_URI: z.string().url().optional(),
    JWT_AUD: z.string().optional(),
    JWT_ISS: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
    N8N_WEBHOOKS_ENABLED: z.string().default('true'),
    CORS_ORIGINS: z.string().optional(),
});
export const env = EnvSchema.parse(process.env);
