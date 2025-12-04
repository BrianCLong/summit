/**
 * Policy Loader Utility
 *
 * Loads and parses policy configurations from various sources.
 *
 * @module pve/utils/policyLoader
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { glob } from 'glob';
import type { PolicyConfig, PolicySet, EvaluationType, PolicySeverity } from '../types/index.js';
import { logger } from './logger.js';

export interface PolicyLoaderOptions {
  /** Base directory for policy files */
  baseDir?: string;
  /** Include patterns for policy files */
  include?: string[];
  /** Exclude patterns */
  exclude?: string[];
  /** Whether to recursively search directories */
  recursive?: boolean;
}

export interface LoadedPolicy {
  config: PolicyConfig;
  source: string;
  content?: string;
}

const DEFAULT_POLICY_DIR = path.join(__dirname, '..', 'policies');

const DEFAULT_INCLUDE = ['**/*.yaml', '**/*.yml', '**/*.json'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

/**
 * Load all policy configurations from a directory
 */
export async function loadPolicies(
  options: PolicyLoaderOptions = {},
): Promise<LoadedPolicy[]> {
  const {
    baseDir = DEFAULT_POLICY_DIR,
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
  } = options;

  const policies: LoadedPolicy[] = [];

  for (const pattern of include) {
    const files = await glob(pattern, {
      cwd: baseDir,
      ignore: exclude,
      absolute: true,
    });

    for (const file of files) {
      try {
        const loaded = await loadPolicyFile(file);
        if (loaded) {
          policies.push(...loaded);
        }
      } catch (error) {
        logger.warn(`Failed to load policy file: ${file}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info(`Loaded ${policies.length} policies`, {
    baseDir,
    patterns: include,
  });

  return policies;
}

/**
 * Load a single policy file
 */
export async function loadPolicyFile(
  filePath: string,
): Promise<LoadedPolicy[] | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let parsed: unknown;

  if (ext === '.json') {
    parsed = JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    parsed = yaml.load(content);
  } else {
    logger.warn(`Unsupported policy file format: ${ext}`, { filePath });
    return null;
  }

  return parsePolicyContent(parsed, filePath);
}

/**
 * Parse policy content into LoadedPolicy objects
 */
function parsePolicyContent(
  content: unknown,
  source: string,
): LoadedPolicy[] {
  if (!content || typeof content !== 'object') {
    return [];
  }

  // Handle policy set
  if (isPolicySet(content)) {
    return content.policies.map((policy) => ({
      config: normalizePolicy(policy, content.defaultSeverity),
      source,
    }));
  }

  // Handle single policy
  if (isPolicyConfig(content)) {
    return [
      {
        config: normalizePolicy(content),
        source,
      },
    ];
  }

  // Handle array of policies
  if (Array.isArray(content)) {
    return content
      .filter(isPolicyConfig)
      .map((policy) => ({
        config: normalizePolicy(policy),
        source,
      }));
  }

  return [];
}

/**
 * Type guard for PolicySet
 */
function isPolicySet(obj: unknown): obj is PolicySet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'policies' in obj &&
    Array.isArray((obj as PolicySet).policies)
  );
}

/**
 * Type guard for PolicyConfig
 */
function isPolicyConfig(obj: unknown): obj is Partial<PolicyConfig> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as PolicyConfig).id === 'string'
  );
}

/**
 * Normalize a policy config with defaults
 */
function normalizePolicy(
  policy: Partial<PolicyConfig>,
  defaultSeverity?: PolicySeverity,
): PolicyConfig {
  return {
    id: policy.id!,
    name: policy.name || policy.id!,
    description: policy.description || '',
    appliesTo: policy.appliesTo || ['custom' as EvaluationType],
    severity: policy.severity || defaultSeverity || 'warning',
    enabled: policy.enabled !== false,
    config: policy.config,
    tags: policy.tags || [],
  };
}

/**
 * Load Rego policy files
 */
export async function loadRegoPolicies(
  baseDir: string = DEFAULT_POLICY_DIR,
): Promise<Map<string, string>> {
  const regoPolicies = new Map<string, string>();

  const files = await glob('**/*.rego', {
    cwd: baseDir,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(baseDir, file);
      const policyId = relativePath.replace(/\.rego$/, '').replace(/[/\\]/g, '.');
      regoPolicies.set(policyId, content);
    } catch (error) {
      logger.warn(`Failed to load Rego policy: ${file}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info(`Loaded ${regoPolicies.size} Rego policies`, { baseDir });

  return regoPolicies;
}

/**
 * Resolve policy path from various inputs
 */
export function resolvePolicyPath(input: string, baseDir?: string): string {
  if (path.isAbsolute(input)) {
    return input;
  }

  if (baseDir) {
    return path.resolve(baseDir, input);
  }

  return path.resolve(DEFAULT_POLICY_DIR, input);
}

/**
 * Get the built-in policies directory
 */
export function getBuiltInPoliciesDir(): string {
  return DEFAULT_POLICY_DIR;
}
