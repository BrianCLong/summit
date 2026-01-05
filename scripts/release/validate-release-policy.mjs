import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const POLICY_PATH = join(process.cwd(), 'release-policy.yml');

console.log(`🔍 Validating policy at ${POLICY_PATH}...`);

try {
  const content = readFileSync(POLICY_PATH, 'utf8');
  const policy = yaml.load(content);

  if (policy.channels) {
    for (const [channel, config] of Object.entries(policy.channels)) {
      // Validate channel names (soft check, warn if unknown)
      if (!['rc', 'ga', 'patch'].includes(channel)) {
        console.warn(`⚠️  Warning: Unknown channel '${channel}' in policy. Known: rc, ga, patch.`);
      }

      // Validate allowed_from
      if (config.allowed_from) {
        if (!Array.isArray(config.allowed_from)) {
          throw new Error(`channels.${channel}.allowed_from must be an array.`);
        }
        const validModes = ['default-branch', 'series-branch'];
        for (const mode of config.allowed_from) {
          if (!validModes.includes(mode)) {
            throw new Error(`Invalid allowed_from mode '${mode}' for channel '${channel}'. Allowed: ${validModes.join(', ')}`);
          }
        }
      }

      // Validate require_evidence
      if (config.require_evidence !== undefined && typeof config.require_evidence !== 'boolean') {
        throw new Error(`channels.${channel}.require_evidence must be a boolean.`);
      }
    }
  }

  console.log('✅ Release policy is valid.');
} catch (e) {
  console.error(`❌ Policy validation failed: ${e.message}`);
  process.exit(1);
}
