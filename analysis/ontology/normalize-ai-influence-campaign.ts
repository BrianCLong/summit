import * as fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as path from "path";

import { AiInfluenceCampaignEnricher } from "../../agents/ontology/aiInfluenceCampaignEnricher";

export function normalizeFixtures(fixturePaths: string[]): any[] {
  const enricher = new AiInfluenceCampaignEnricher();
  const normalizedFixtures = [];

  for (const fp of fixturePaths) {
    const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
    normalizedFixtures.push(enricher.enrich(data));
  }

  // Sort the overall list by campaign_id deterministically
  normalizedFixtures.sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));

  return normalizedFixtures;
}
