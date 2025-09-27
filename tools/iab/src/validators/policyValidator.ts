import yaml from 'js-yaml';
import { ArtifactConfig, ValidationResult } from '../types.js';

const COMMIT_SHA = /^[0-9a-f]{7,40}$/i;

export function validatePolicy(artifact: ArtifactConfig, rawContent: string): ValidationResult {
  try {
    const parsed = rawContent.trim().startsWith('{')
      ? JSON.parse(rawContent)
      : (yaml.load(rawContent) as Record<string, unknown> | undefined);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('policy is not a JSON/YAML object');
    }

    const commitSha = (artifact.metadata?.commitSha ?? (parsed as Record<string, unknown>).commitSha) as
      | string
      | undefined;

    if (!commitSha || !COMMIT_SHA.test(commitSha)) {
      return {
        status: 'failed',
        validator: 'PolicyValidator',
        details: ['missing or invalid commit SHA for policy provenance']
      };
    }

    const controls = Array.isArray((parsed as Record<string, unknown>).controls)
      ? ((parsed as Record<string, unknown>).controls as unknown[]).length
      : 0;

    return {
      status: 'passed',
      validator: 'PolicyValidator',
      details: [`commit ${commitSha} recorded`, `controls enumerated: ${controls}`],
      metadata: {
        commitSha,
        controls
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      validator: 'PolicyValidator',
      details: [(error as Error).message]
    };
  }
}
