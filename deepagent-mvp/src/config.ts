import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'your-secret-key', 'localhost', 'user'];
  if (insecureValues.includes(value.toLowerCase())) {
    console.error(`FATAL: ${name} is set to an insecure default value: "${value}"`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

export const config = {
  port: process.env.PORT || 8080,
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'user',
    password: requireSecret('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD),
    database: process.env.POSTGRES_DB || 'deepagent',
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: requireSecret('NEO4J_PASSWORD', process.env.NEO4J_PASSWORD),
  },
  jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, 32),
  auth: {
    jwksUri: process.env.JWKS_URI || 'https://your-auth-provider.com/.well-known/jwks.json',
    audience: process.env.JWT_AUDIENCE || 'your-api-audience',
    issuer: process.env.JWT_ISSUER || 'https://your-auth-provider.com/',
  }
};
