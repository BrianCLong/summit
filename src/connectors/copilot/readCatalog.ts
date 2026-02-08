import fs from 'node:fs';
import path from 'node:path';

export type CopilotModelCatalog = {
  version: number;
  models: CopilotModelProfile[];
};

export type CopilotModelProfile = {
  id: string;
  state: 'preview' | 'ga' | 'retired' | 'unknown';
  tiers: Array<'copilot_pro_plus' | 'copilot_enterprise' | 'unknown'>;
  surfaces: string[];
  policyRequiredKeys: string[];
  premiumMultiplier?: number;
  promoWindow?: {
    startISO: string;
    endISO: string;
  };
  sources?: Array<{ label: string; url: string }>;
};

export const readCopilotModelCatalog = (): CopilotModelCatalog => {
  const catalogPath = path.join(
    process.cwd(),
    'src',
    'connectors',
    'copilot',
    'models.catalog.json',
  );

  const raw = fs.readFileSync(catalogPath, 'utf8');
  return JSON.parse(raw) as CopilotModelCatalog;
};
