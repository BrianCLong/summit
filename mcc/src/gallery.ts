import { writeFileSync } from 'node:fs';
import { CompiledModelCard } from './types.js';

export interface GalleryEntry {
  modelId: string;
  version: string;
  description: string;
  owner: string;
  riskLevel: string;
  metrics: { name: string; value: number; unit?: string }[];
  intendedUse: string[];
}

export function buildGalleryDataset(cards: CompiledModelCard[]): GalleryEntry[] {
  return cards.map((card) => {
    const highestRisk = card.risk.flags.reduce((current, flag) => {
      const levels = ['low', 'medium', 'high'];
      return levels.indexOf(flag.level) > levels.indexOf(current.level)
        ? { level: flag.level, flag }
        : current;
    },
    { level: 'low', flag: card.risk.flags[0] });

    return {
      modelId: card.metadata.modelId,
      version: card.metadata.version,
      description: card.description,
      owner: card.metadata.owner,
      riskLevel: highestRisk.level,
      metrics: card.metrics.map((metric) => ({
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
      })),
      intendedUse: card.intendedUse.supportedPurposes,
    };
  });
}

export function writeGalleryDataset(outputPath: string, cards: CompiledModelCard[]) {
  const dataset = buildGalleryDataset(cards);
  writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');
}
