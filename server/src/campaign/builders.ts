import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Campaign } from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCampaignTemplate(templateName: string): Promise<Campaign> {
  const filePath = path.join(__dirname, 'templates', `${templateName}.json`);
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
