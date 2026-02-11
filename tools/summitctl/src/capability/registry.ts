import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { CapabilityRegistry, CapabilitySpec } from './types';

const REGISTRY_FILE_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

export function loadCapabilityRegistry(registryDir: string): CapabilityRegistry {
  const files = fs
    .readdirSync(registryDir)
    .filter((file) => REGISTRY_FILE_EXTENSIONS.has(path.extname(file)))
    .map((file) => path.join(registryDir, file))
    .sort();

  const capabilities: CapabilitySpec[] = [];
  let version = 1;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = filePath.endsWith('.json')
      ? (JSON.parse(raw) as CapabilityRegistry)
      : (yaml.parse(raw) as CapabilityRegistry);

    if (parsed.version) {
      version = parsed.version;
    }

    if (Array.isArray(parsed.capabilities)) {
      capabilities.push(...parsed.capabilities);
    }
  }

  return {
    version,
    capabilities: capabilities.sort((a, b) =>
      a.capability_id.localeCompare(b.capability_id),
    ),
  };
}

export function compileRegistry(registry: CapabilityRegistry) {
  const capability_index = registry.capabilities.reduce<Record<string, any>>(
    (acc, capability) => {
      acc[capability.capability_id] = {
        data_classification: capability.data_classification,
        operations: capability.operations,
        policy_refs: capability.policy_refs ?? [],
        matchers: capability.matchers ?? [],
      };
      return acc;
    }, {}
  );

  return {
    version: registry.version,
    capabilities: registry.capabilities,
    capability_index,
  };
}

export function validateRegistry(
  registry: CapabilityRegistry,
  repoRoot: string,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!registry.capabilities.length) {
    errors.push('No capabilities found in registry.');
  }

  const seen = new Set<string>();

  for (const capability of registry.capabilities) {
    if (!capability.capability_id) {
      errors.push('Capability missing capability_id.');
      continue;
    }
    if (seen.has(capability.capability_id)) {
      errors.push(`Duplicate capability_id: ${capability.capability_id}`);
    }
    seen.add(capability.capability_id);

    if (!capability.name || !capability.description) {
      errors.push(`Capability ${capability.capability_id} missing name/description.`);
    }

    if (!capability.owner_team || !capability.repo || !capability.service) {
      errors.push(`Capability ${capability.capability_id} missing ownership metadata.`);
    }

    if (!capability.allowed_identities?.length) {
      errors.push(`Capability ${capability.capability_id} has no allowed_identities.`);
    }

    if (!capability.operations?.length) {
      errors.push(`Capability ${capability.capability_id} missing operations.`);
    }

    if (!capability.schemas?.input_schema_ref || !capability.schemas?.output_schema_ref) {
      warnings.push(`Capability ${capability.capability_id} missing schema references.`);
    } else {
      const inputSchemaPath = path.join(repoRoot, capability.schemas.input_schema_ref);
      const outputSchemaPath = path.join(repoRoot, capability.schemas.output_schema_ref);
      if (!fs.existsSync(inputSchemaPath)) {
        errors.push(`Missing input schema for ${capability.capability_id}: ${capability.schemas.input_schema_ref}`);
      }
      if (!fs.existsSync(outputSchemaPath)) {
        errors.push(`Missing output schema for ${capability.capability_id}: ${capability.schemas.output_schema_ref}`);
      }
    }

    if (!capability.policy_refs?.length) {
      warnings.push(`Capability ${capability.capability_id} has no policy_refs.`);
    } else {
      for (const policyRef of capability.policy_refs) {
        const policyPath = path.join(repoRoot, policyRef);
        if (!fs.existsSync(policyPath)) {
          errors.push(`Missing policy ref for ${capability.capability_id}: ${policyRef}`);
        }
      }
    }
  }

  return { errors, warnings };
}
