/**
 * Secure credential validation utility
 *
 * Enforces fail-closed credential handling with:
 * - Required environment variables (no defaults)
 * - Minimum length requirements
 * - Detection of insecure default values
 * - Clear error messages with remediation steps
 *
 * @example
 * ```typescript
 * import { requireSecret } from '@packages/shared/security/requireSecret';
 *
 * const config = {
 *   jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, 32),
 *   dbPassword: requireSecret('DB_PASSWORD', process.env.DB_PASSWORD),
 * };
 * ```
 */

const INSECURE_VALUES = [
  'password',
  'secret',
  'changeme',
  'default',
  'localhost',
  'test',
  'demo',
  'example',
  'your-secret-key',
  'your-secret-key-change-in-production',
  'workflow-engine-secret',
  'workflow-webhook-secret',
  'graph-analytics-secret',
  'analytics-engine-secret',
  'ml-engine-secret',
  'dev-signing-key',
  'dev-signing-key-change-in-production',
  'demo-api-key',
  'local-dev-key',
  'fake-secret',
];

export function requireSecret(
  name: string,
  value: string | undefined,
  minLength: number = 16
): string {
  // Check if value is provided
  if (!value) {
    console.error(`╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║ FATAL SECURITY ERROR: Missing Required Secret                ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝`);
    console.error(``);
    console.error(`Environment variable "${name}" is REQUIRED but not set.`);
    console.error(``);
    console.error(`To fix this:`);
    console.error(`  1. Generate a secure secret:`);
    console.error(`     openssl rand -base64 32`);
    console.error(``);
    console.error(`  2. Set the environment variable:`);
    console.error(`     export ${name}="<generated-secret>"`);
    console.error(``);
    console.error(`  3. Or add to .env file:`);
    console.error(`     ${name}=<generated-secret>`);
    console.error(``);
    process.exit(1);
  }

  // Check minimum length
  if (value.length < minLength) {
    console.error(`╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║ FATAL SECURITY ERROR: Secret Too Short                       ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝`);
    console.error(``);
    console.error(`Environment variable "${name}" must be at least ${minLength} characters.`);
    console.error(`Current length: ${value.length} characters`);
    console.error(``);
    console.error(`To fix this, generate a longer secret:`);
    console.error(`  openssl rand -base64 ${Math.ceil(minLength * 0.75)}`);
    console.error(``);
    process.exit(1);
  }

  // Check for insecure defaults
  const normalizedValue = value.toLowerCase().trim();
  if (INSECURE_VALUES.includes(normalizedValue)) {
    console.error(`╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║ FATAL SECURITY ERROR: Insecure Default Secret                ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝`);
    console.error(``);
    console.error(`Environment variable "${name}" is set to an INSECURE value.`);
    console.error(`Value detected: "${value}"`);
    console.error(``);
    console.error(`This is a well-known default and MUST NOT be used in any environment.`);
    console.error(``);
    console.error(`To fix this:`);
    console.error(`  1. Generate a strong, unique secret:`);
    console.error(`     openssl rand -base64 32`);
    console.error(``);
    console.error(`  2. Replace ${name} with the generated value`);
    console.error(``);
    process.exit(1);
  }

  return value;
}

/**
 * Optional secret that doesn't exit if missing
 *
 * Use this for optional features that should gracefully degrade
 * if credentials are not provided.
 *
 * @example
 * ```typescript
 * const slackToken = optionalSecret('SLACK_BOT_TOKEN', process.env.SLACK_BOT_TOKEN, 32);
 * const slackEnabled = Boolean(slackToken);
 * ```
 */
export function optionalSecret(
  name: string,
  value: string | undefined,
  minLength: number = 16
): string | undefined {
  if (!value) {
    return undefined;
  }

  // If provided, validate it
  try {
    return requireSecret(name, value, minLength);
  } catch (error) {
    // If validation fails for optional secret, log warning and return undefined
    console.warn(`Warning: Optional secret "${name}" is invalid and will be ignored`);
    return undefined;
  }
}
