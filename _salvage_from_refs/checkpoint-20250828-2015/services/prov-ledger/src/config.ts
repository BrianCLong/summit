export type LedgerConfig = {
  neo4j?: { url: string; user: string; password: string };
  s3?: { endpoint?: string; region?: string; accessKeyId?: string; secretAccessKey?: string; bucket: string };
};

export function loadConfig(): LedgerConfig {
  const cfg: LedgerConfig = {};
  if (process.env.NEO4J_URL && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD) {
    cfg.neo4j = { url: process.env.NEO4J_URL!, user: process.env.NEO4J_USER!, password: process.env.NEO4J_PASSWORD! };
  }
  if (process.env.S3_BUCKET) {
    cfg.s3 = {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET!
    };
  }
  return cfg;
}
