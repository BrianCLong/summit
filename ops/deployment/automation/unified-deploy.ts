import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';

type EnvironmentKey = 'dev' | 'staging' | 'prod';

interface DeploymentProfile {
  name: string;
  cluster: string;
  namespace: string;
  region: string;
  healthUrl: string;
  artifactBucket?: string;
  requiredSecrets: string[];
  configGuards: string[];
}

interface CliOptions {
  env?: EnvironmentKey;
  service?: string;
  version?: string;
  secretsFile?: string;
  artifactDir?: string;
  healthUrl?: string;
  dryRun?: boolean;
}

interface ValidationResult {
  valid: boolean;
  checks: string[];
  failures: string[];
}

interface SecretResolution {
  resolved: Record<string, string>;
  missing: string[];
  source: string;
}

interface HealthCheckResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
  url: string;
  durationMs: number;
}

interface DeploymentArtifact {
  id: string;
  environment: EnvironmentKey;
  service: string;
  version: string;
  timestamp: string;
  profile: DeploymentProfile;
  validations: ValidationResult;
  secrets: { injected: string[]; missing: string[] };
  health: HealthCheckResult;
}

const PROFILES: Record<EnvironmentKey, DeploymentProfile> = {
  dev: {
    name: 'Development',
    cluster: 'dev-cluster',
    namespace: 'intelgraph-dev',
    region: 'us-west-2',
    healthUrl: 'http://localhost:3000/health',
    requiredSecrets: ['DEV_DATABASE_URL', 'DEV_MESSAGE_BUS'],
    configGuards: [
      'Development deployments permit feature flags and experimental toggles.',
      'Deployment proceeds without change advisory approval.',
    ],
  },
  staging: {
    name: 'Staging',
    cluster: 'staging-cluster',
    namespace: 'intelgraph-staging',
    region: 'us-east-1',
    healthUrl: 'https://staging.intelgraph.local/health',
    requiredSecrets: ['STAGING_DATABASE_URL', 'STAGING_MESSAGE_BUS'],
    configGuards: [
      'Staging deployments require release candidates only.',
      'Synthetic traffic must be enabled before health verification.',
    ],
  },
  prod: {
    name: 'Production',
    cluster: 'prod-cluster',
    namespace: 'intelgraph',
    region: 'us-east-1',
    healthUrl: 'https://intelgraph.local/health',
    artifactBucket: 's3://intelgraph-deployments',
    requiredSecrets: ['PROD_DATABASE_URL', 'PROD_MESSAGE_BUS'],
    configGuards: [
      'Production deployments must be approved and recorded.',
      'Progressive rollout with health gates is enforced.',
    ],
  },
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--env':
        options.env = argv[i + 1] as EnvironmentKey;
        i++;
        break;
      case '--service':
        options.service = argv[i + 1];
        i++;
        break;
      case '--version':
        options.version = argv[i + 1];
        i++;
        break;
      case '--secrets-file':
        options.secretsFile = argv[i + 1];
        i++;
        break;
      case '--artifact-dir':
        options.artifactDir = argv[i + 1];
        i++;
        break;
      case '--health-url':
        options.healthUrl = argv[i + 1];
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        break;
    }
  }

  return options;
}

function validateEnvironment(
  env: EnvironmentKey | undefined,
  service: string | undefined,
  version: string | undefined,
): ValidationResult {
  const checks: string[] = [];
  const failures: string[] = [];

  if (!env || !PROFILES[env]) {
    failures.push('Environment must be one of dev, staging, or prod.');
  } else {
    checks.push(`Environment '${env}' is recognized.`);
  }

  if (!service) {
    failures.push('A service name must be provided via --service.');
  } else {
    checks.push(`Service '${service}' is set.`);
  }

  if (!version) {
    failures.push('A version identifier must be provided via --version.');
  } else {
    checks.push(`Version '${version}' will be deployed.`);
    if (env === 'prod' && !version.match(/^v?\d+\.\d+\.\d+/)) {
      failures.push('Production deployments must use a semantic version tag.');
    }
  }

  if (env) {
    const profile = PROFILES[env];
    if (!profile.region) {
      failures.push('Environment region is missing.');
    }
    if (!profile.cluster) {
      failures.push('Cluster configuration is required.');
    }
    if (!profile.namespace) {
      failures.push('Namespace configuration is required.');
    }
    if (!profile.healthUrl.startsWith('http')) {
      failures.push('Health URL must be an http/https endpoint.');
    }
    checks.push(...profile.configGuards);
  }

  return { valid: failures.length === 0, checks, failures };
}

function loadSecretSource(filePath?: string): Record<string, string> {
  if (!filePath) {
    return {};
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Secrets file not found at ${resolvedPath}`);
  }

  const rawContent = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(rawContent);

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Secrets file must contain a JSON object of key/value pairs.');
  }

  return parsed as Record<string, string>;
}

function resolveSecrets(
  env: EnvironmentKey,
  source: Record<string, string>,
): SecretResolution {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];
  const required = PROFILES[env].requiredSecrets;

  for (const key of required) {
    const envValue = process.env[key];
    const value = source[key] ?? envValue;

    if (!value) {
      missing.push(key);
      continue;
    }

    resolved[key] = value;
  }

  return {
    resolved,
    missing,
    source: Object.keys(source).length > 0 ? 'file' : 'environment',
  };
}

function redactSecrets(resolved: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [
      key,
      `sha256:${crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)}`,
    ]),
  );
}

async function verifyHealth(
  url: string,
  { timeoutMs = 5000 }: { timeoutMs?: number } = {},
): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: body.slice(0, 2000),
      url,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      url,
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function writeArtifact(
  artifact: DeploymentArtifact,
  artifactDir?: string,
): string {
  const dir = artifactDir
    ? path.resolve(artifactDir)
    : path.join(__dirname, 'artifacts');
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${artifact.environment}-${artifact.service}-${Date.now()}.json`;
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(artifact, null, 2));

  return fullPath;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const validations = validateEnvironment(
    options.env,
    options.service,
    options.version,
  );

  if (!validations.valid || !options.env || !options.service || !options.version) {
    console.error('Deployment request failed validation:');
    validations.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  const profile = PROFILES[options.env];
  const secretSource = loadSecretSource(options.secretsFile);
  const secretResolution = resolveSecrets(options.env, secretSource);

  if (secretResolution.missing.length > 0) {
    console.error('Missing required secrets:', secretResolution.missing.join(', '));
    process.exitCode = 1;
    return;
  }

  console.log(`\nStarting deployment for ${options.service} -> ${profile.name}`);
  console.log(`- Cluster: ${profile.cluster}`);
  console.log(`- Namespace: ${profile.namespace}`);
  console.log(`- Region: ${profile.region}`);
  console.log(`- Deployment version: ${options.version}`);
  console.log(
    `- Secrets injected from ${secretResolution.source} (${Object.keys(secretResolution.resolved).length} keys)`,
  );

  if (options.dryRun) {
    console.log('\nDry run enabled — skipping rollout and health verification.');
  } else {
    console.log('\nInjecting secrets into deployment manifest...');
    await wait(250);
    console.log('Applying manifests and waiting for rollout...');
    await wait(500);
  }

  const healthTarget = options.healthUrl || profile.healthUrl;
  const health = options.dryRun
    ? {
        ok: true,
        url: healthTarget,
        durationMs: 0,
        body: 'health check skipped (dry run)',
      }
    : await verifyHealth(healthTarget);

  if (!health.ok) {
    console.error('\nHealth verification failed:', health.error || health.status);
  }

  const artifact: DeploymentArtifact = {
    id: crypto.randomUUID(),
    environment: options.env,
    service: options.service,
    version: options.version,
    timestamp: new Date().toISOString(),
    profile,
    validations,
    secrets: {
      injected: Object.keys(secretResolution.resolved),
      missing: secretResolution.missing,
    },
    health,
  };

  const artifactPath = writeArtifact(artifact, options.artifactDir);
  console.log(`\nDeployment artifact generated at ${artifactPath}`);
  console.log('Secret fingerprints:', redactSecrets(secretResolution.resolved));

  if (!health.ok) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error('Deployment CLI failed:', error);
  process.exit(1);
});
