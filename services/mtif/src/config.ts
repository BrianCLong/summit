export interface MtifConfig {
  port: number;
  signingSecret: string;
  apiRoot: string;
}

export const loadConfig = (): MtifConfig => {
  const port = Number.parseInt(process.env.MTIF_PORT ?? '8085', 10);
  const signingSecret = process.env.MTIF_SIGNING_SECRET ?? 'mtif-signing-secret';
  const apiRoot = process.env.MTIF_TAXII_ROOT ?? '/taxii2/api-root';

  return { port, signingSecret, apiRoot };
};
