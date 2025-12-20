/**
 * Area detection classifier
 * Detects which areas an issue belongs to (copilot, ingestion, graph, UI, infra, etc.)
 */

import { TriageItem } from '../types.js';
import { AreaConfig } from '../config.js';

export function detectAreas(item: TriageItem, areaConfigs: AreaConfig[]): string[] {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const areaScores: Map<string, number> = new Map();

  for (const config of areaConfigs) {
    let score = 0;

    // Keyword matching
    for (const keyword of config.keywords) {
      const keywordLower = keyword.toLowerCase();
      const count = (text.match(new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'g')) || [])
        .length;
      score += count * config.weight;
    }

    // Pattern matching
    for (const pattern of config.patterns) {
      const matches = text.match(new RegExp(pattern, 'gi')) || [];
      score += matches.length * config.weight * 1.5; // Patterns have higher weight
    }

    if (score > 0) {
      areaScores.set(config.name, score);
    }
  }

  // Also check component field if available
  if (item.component) {
    const componentLower = item.component.toLowerCase();
    for (const config of areaConfigs) {
      for (const keyword of config.keywords) {
        if (componentLower.includes(keyword.toLowerCase())) {
          const currentScore = areaScores.get(config.name) || 0;
          areaScores.set(config.name, currentScore + 2 * config.weight);
        }
      }
    }
  }

  // Return areas sorted by score, keep top areas (threshold: score > 1)
  const sortedAreas = Array.from(areaScores.entries())
    .filter(([_, score]) => score > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area);

  // Return top 3 areas max, or at least 1 if any match
  return sortedAreas.length > 0 ? sortedAreas.slice(0, 3) : ['uncategorized'];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
