import fs from 'node:fs';
import path from 'node:path';
import type { GateConfig } from './types.js';

export function loadConfig(configPath: string): GateConfig {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Gate config not found at ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<GateConfig>;
  const normalized = normalizeConfig(parsed);
  validateConfig(normalized);
  return normalized;
}

function normalizeConfig(config: Partial<GateConfig>): GateConfig {
  return {
    workflowGate: config.workflowGate ?? {
      workflowGlobs: [],
      enforcePinnedActions: true,
      enforceMinimumPermissions: { contents: 'read' }
    },
    imageGate: config.imageGate ?? { stageImages: [] },
    secretScan: config.secretScan ?? { paths: [], excludedGlobs: [], allowPatterns: [] },
    policyGate: config.policyGate ?? {
      inputPath: '',
      denyWildcardIam: true,
      allowPublicEndpoints: false
    }
  };
}

function validateConfig(config: GateConfig): void {
  if (!config.workflowGate.workflowGlobs.length) {
    throw new Error('workflowGate.workflowGlobs must include at least one glob');
  }
  if (!config.imageGate.stageImages.length) {
    throw new Error('imageGate.stageImages must list at least one image requirement');
  }
  if (!config.secretScan.paths.length) {
    throw new Error('secretScan.paths must include at least one path to scan');
  }
  if (!config.policyGate.inputPath) {
    throw new Error('policyGate.inputPath is required');
  }
}
