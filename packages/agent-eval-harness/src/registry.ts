// @ts-nocheck
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface DatasetRegistryEntry {
  id: string;
  name: string;
  category: 'tool_use' | 'web_agent' | 'code' | 'reasoning' | 'safety' | 'multi_agent' | 'domain';
  license: string;
  source_url: string;
  intended_use: 'eval' | 'train' | 'both';
  notes?: string;
  provenance_required: boolean;
}

const defaultRegistryPath = path.resolve(process.cwd(), 'docs/datasets/agent-dataset-registry.yaml');

export function loadDatasetRegistry(registryPath: string = defaultRegistryPath): DatasetRegistryEntry[] {
  const content = fs.readFileSync(registryPath, 'utf-8');
  const parsed = yaml.load(content) as { datasets?: DatasetRegistryEntry[] } | undefined;

  if (!parsed?.datasets || !Array.isArray(parsed.datasets)) {
    return [];
  }

  return parsed.datasets.map((entry) => ({
    ...entry,
    license: entry.license ?? 'unknown',
    notes: entry.notes ?? '',
  }));
}

export function findDatasetById(id: string, registryPath?: string): DatasetRegistryEntry | undefined {
  const datasets = loadDatasetRegistry(registryPath);
  return datasets.find((dataset) => dataset.id === id);
}

export const DATASET_REGISTRY_PATH = defaultRegistryPath;
