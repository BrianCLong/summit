import { AiInfluenceCampaignEnricher } from '../../agents/ontology/aiInfluenceCampaignEnricher';
import * as fs from 'fs';
import * as path from 'path';

export function normalizeFixtures(fixturePaths: string[]): any[] {
  const enricher = new AiInfluenceCampaignEnricher();
  const normalizedFixtures = [];

  for (const fp of fixturePaths) {
    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    normalizedFixtures.push(enricher.enrich(data));
  }

  // Sort the overall list by campaign_id deterministically
  normalizedFixtures.sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));

  return normalizedFixtures;
}
