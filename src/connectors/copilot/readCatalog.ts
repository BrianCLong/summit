import fs from 'node:fs';
import path from 'node:path';

import { CopilotModelProfile } from '../../policies/copilotModelPolicy';

type CopilotModelCatalog = {
  version: number;
  profiles: CopilotModelProfile[];
};

const defaultCatalogPath = path.join(
  process.cwd(),
  'src',
  'connectors',
  'copilot',
  'models.catalog.json',
);

export function readCopilotModelCatalog(
  catalogPath: string = defaultCatalogPath,
): CopilotModelCatalog {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Missing Copilot model catalog at ${catalogPath}`);
  }

  const raw = fs.readFileSync(catalogPath, 'utf8');
  const parsed = JSON.parse(raw) as CopilotModelCatalog;

  if (!Array.isArray(parsed.profiles)) {
    throw new Error('Copilot model catalog missing profiles[]');
  }

  return parsed;
}
