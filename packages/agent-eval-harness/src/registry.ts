import fs from 'node:fs';
import path from 'node:path';
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

interface DatasetRegistryFile {
  datasets?: DatasetRegistryEntry[];
}

const defaultRegistryPath = path.resolve(
  process.cwd(),
  'docs/datasets/agent-dataset-registry.yaml',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDatasetRegistryEntry(value: unknown): value is DatasetRegistryEntry {
  if (!isRecord(value)) {return false;}
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    typeof value.source_url === 'string' &&
    typeof value.intended_use === 'string' &&
    typeof value.provenance_required === 'boolean'
  );
}

function normalizeDataset(entry: DatasetRegistryEntry): DatasetRegistryEntry {
  return {
    ...entry,
    license: entry.license ?? 'unknown',
    notes: entry.notes ?? '',
  };
}

export function loadDatasetRegistry(registryPath: string = defaultRegistryPath): DatasetRegistryEntry[] {
  const content = fs.readFileSync(registryPath, 'utf-8');
  const parsed = yaml.load(content) as DatasetRegistryFile | undefined;

  if (!parsed?.datasets || !Array.isArray(parsed.datasets)) {
    return [];
  }

  return parsed.datasets
    .filter((entry) => isDatasetRegistryEntry(entry))
    .map((entry) => normalizeDataset(entry));
}

export function findDatasetById(id: string, registryPath?: string): DatasetRegistryEntry | undefined {
  const datasets = loadDatasetRegistry(registryPath);
  return datasets.find((dataset) => dataset.id === id);
}

export const DATASET_REGISTRY_PATH = defaultRegistryPath;
