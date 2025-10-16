#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps developers create secure .env files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

// Generate secure secrets
function generateSecrets() {
  return {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  };
}

// Create development environment file
function createDevelopmentEnv() {
  const secrets = generateSecrets();

  const envContent = `# IntelGraph Server - Development Environment
# Auto-generated with secure defaults $(new Date().toISOString())

# Application
NODE_ENV=development
PORT=8080

# Database URLs
DATABASE_URL=postgresql://maestro:maestro-dev-secret@localhost:5432/maestro
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j-dev-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis-dev-secret

# Security (auto-generated secure secrets)
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=${secrets.SESSION_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# OIDC Configuration (configure for production)
# OIDC_ISSUER=https://your-oidc-provider.com
# OIDC_CLIENT_ID=your-client-id
# OIDC_CLIENT_SECRET=your-client-secret
# OIDC_REDIRECT_URI=http://localhost:8080/auth/callback

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# External APIs (optional)
# OPENAI_API_KEY=sk-your-openai-key
# VIRUSTOTAL_API_KEY=your-virustotal-key

# Feature Flags
AI_ENABLED=false
KAFKA_ENABLED=false
MAESTRO_MCP_ENABLED=true
MAESTRO_PIPELINES_ENABLED=true

# Logging
LOG_LEVEL=debug

# TLS (optional for development)
# TLS_KEY_PATH=/path/to/private.key
# TLS_CERT_PATH=/path/to/certificate.crt
`;

  return envContent;
}

// Create production environment template
function createProductionEnvTemplate() {
  return `# IntelGraph Server - Production Environment Template
# IMPORTANT: Replace all placeholder values with actual production values

# Application
NODE_ENV=production
PORT=8080

# Database URLs (REPLACE WITH PRODUCTION VALUES)
DATABASE_URL=postgresql://username:password@db-host:5432/database
NEO4J_URI=bolt://neo4j-host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=CHANGE_ME_PRODUCTION_PASSWORD

# Redis Configuration (REPLACE WITH PRODUCTION VALUES)
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_PRODUCTION_REDIS_PASSWORD

# Security (GENERATE NEW SECRETS FOR PRODUCTION)
JWT_SECRET=GENERATE_32_BYTE_HEX_STRING_FOR_PRODUCTION
JWT_REFRESH_SECRET=GENERATE_DIFFERENT_32_BYTE_HEX_STRING_FOR_PRODUCTION
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=GENERATE_32_BYTE_HEX_STRING_FOR_PRODUCTION
ENCRYPTION_KEY=GENERATE_32_BYTE_HEX_STRING_FOR_PRODUCTION

# OIDC Configuration (REQUIRED IN PRODUCTION)
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-production-client-id
OIDC_CLIENT_SECRET=your-production-client-secret
OIDC_REDIRECT_URI=https://your-domain.com/auth/callback

# CORS (UPDATE WITH PRODUCTION DOMAIN)
CORS_ORIGIN=https://your-production-domain.com

# Rate Limiting (ADJUST FOR PRODUCTION LOAD)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External APIs (PRODUCTION KEYS)
# OPENAI_API_KEY=sk-your-production-openai-key
# VIRUSTOTAL_API_KEY=your-production-virustotal-key

# Feature Flags
AI_ENABLED=true
KAFKA_ENABLED=false
MAESTRO_MCP_ENABLED=true
MAESTRO_PIPELINES_ENABLED=true

# Logging
LOG_LEVEL=info

# TLS (RECOMMENDED FOR PRODUCTION)
# TLS_KEY_PATH=/etc/ssl/private/your-domain.key
# TLS_CERT_PATH=/etc/ssl/certs/your-domain.crt
`;
}

// Main setup function
async function setupEnvironment() {
  const envFile = path.join(serverDir, '.env');
  const envExampleFile = path.join(serverDir, '.env.example');
  const envProductionTemplateFile = path.join(
    serverDir,
    '.env.production.template',
  );

  console.log('🔐 IntelGraph Environment Setup');
  console.log('================================');

  // Check if .env already exists
  if (fs.existsSync(envFile)) {
    console.log('⚠️  .env file already exists. Backup created as .env.backup');
    fs.copyFileSync(envFile, path.join(serverDir, '.env.backup'));
  }

  // Create development .env file
  const devEnv = createDevelopmentEnv();
  fs.writeFileSync(envFile, devEnv);
  console.log('✅ Created .env file with secure development defaults');

  // Update .env.example
  fs.writeFileSync(
    envExampleFile,
    devEnv.replace(
      /^(JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET|ENCRYPTION_KEY)=.+$/gm,
      '$1=CHANGE_ME_GENERATE_SECURE_SECRET',
    ),
  );
  console.log('✅ Updated .env.example file');

  // Create production template
  const prodTemplate = createProductionEnvTemplate();
  fs.writeFileSync(envProductionTemplateFile, prodTemplate);
  console.log('✅ Created .env.production.template for production deployment');

  console.log('');
  console.log('🚀 Environment setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review and customize .env file as needed');
  console.log(
    '2. Start database services: docker-compose -f docker-compose.db.yml up -d',
  );
  console.log('3. Run migrations: npm run migrate');
  console.log('4. Start the server: npm run dev');
  console.log('');
  console.log('For production deployment:');
  console.log('1. Use .env.production.template as a base');
  console.log('2. Replace ALL placeholder values with production settings');
  console.log(
    "3. Generate new secrets using: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
  console.log('');
  console.log('🔒 Security Notes:');
  console.log('- Never commit .env files to version control');
  console.log('- Use different secrets for each environment');
  console.log('- Rotate secrets regularly in production');
  console.log('- Use environment-specific OIDC configuration');
}

// Run the setup
setupEnvironment().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
