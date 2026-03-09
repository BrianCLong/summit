import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Campaign } from './schema';

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

export async function loadCampaignTemplate(templateName: string): Promise<Campaign> {
  // Validate templateName to prevent Path Traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      throw new Error(`Invalid template name: ${templateName}`);
  }

  const filePath = path.join(_dirname, 'templates', `${templateName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const campaign = JSON.parse(data) as Campaign;
    return campaign;
  } catch (error) {
    throw new Error(`Failed to load template ${templateName}: ${error}`);
  }
}

export function validateCampaign(campaign: Campaign): boolean {
    if (!campaign.id || !campaign.name) return false;
    if (!Array.isArray(campaign.actors)) return false;
    if (!Array.isArray(campaign.assets)) return false;
    if (!Array.isArray(campaign.narratives)) return false;
    if (!Array.isArray(campaign.evidence)) return false;
    if (!Array.isArray(campaign.actions)) return false;
    return true;
}
