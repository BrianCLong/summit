/**
 * Auto-labeling module
 * Generates GitHub labels and titles for issues
 */

import { TriageItem } from '../types.js';

export interface LabelSuggestion {
  issueId: string;
  labels: string[];
  suggestedTitle?: string;
  confidence: number;
}

export function generateLabels(item: TriageItem): LabelSuggestion {
  const labels: string[] = [];

  // Area labels
  item.area.forEach((area) => {
    if (area !== 'uncategorized') {
      labels.push(`area:${area}`);
    }
  });

  // Impact/Priority labels
  switch (item.impact) {
    case 'blocker':
      labels.push('priority:blocker', 'p0');
      break;
    case 'high':
      labels.push('priority:high', 'p1');
      break;
    case 'medium':
      labels.push('priority:medium', 'p2');
      break;
    case 'low':
      labels.push('priority:low', 'p3');
      break;
  }

  // Type labels
  switch (item.type) {
    case 'bug':
      labels.push('type:bug', 'bug');
      break;
    case 'tech-debt':
      labels.push('type:tech-debt', 'technical-debt');
      break;
    case 'feature':
      labels.push('type:feature', 'enhancement');
      break;
    case 'enhancement':
      labels.push('type:enhancement', 'improvement');
      break;
  }

  // Good first issue
  if (item.isGoodFirstIssue) {
    labels.push('good-first-issue', 'beginner-friendly');
  }

  // Cluster theme
  if (item.clusterTheme) {
    labels.push(`theme:${sanitizeLabelName(item.clusterTheme)}`);
  }

  // Calculate confidence based on classification strength
  const confidence = calculateConfidence(item);

  return {
    issueId: item.id,
    labels: [...new Set(labels)], // Remove duplicates
    confidence,
  };
}

export function generateBatchLabels(items: TriageItem[]): LabelSuggestion[] {
  return items.map((item) => generateLabels(item));
}

/**
 * Generate improved title for an issue
 */
export function suggestImprovedTitle(item: TriageItem): string | undefined {
  const currentTitle = item.title.trim();

  // Don't suggest if title already has good format
  if (
    /^(feat|fix|refactor|docs|test|chore|perf|style|ci|build):/.test(currentTitle.toLowerCase())
  ) {
    return undefined;
  }

  // Suggest conventional commit format
  let prefix = '';
  switch (item.type) {
    case 'bug':
      prefix = 'fix';
      break;
    case 'feature':
      prefix = 'feat';
      break;
    case 'tech-debt':
      prefix = 'refactor';
      break;
    case 'enhancement':
      prefix = 'perf';
      break;
  }

  // Add scope if area is clear
  const scope = item.area.length === 1 && item.area[0] !== 'uncategorized' ? item.area[0] : '';

  const suggestedTitle = scope
    ? `${prefix}(${scope}): ${lowercaseFirst(currentTitle)}`
    : `${prefix}: ${lowercaseFirst(currentTitle)}`;

  return suggestedTitle !== currentTitle ? suggestedTitle : undefined;
}

function calculateConfidence(item: TriageItem): number {
  let confidence = 0.5; // Base confidence

  // Higher confidence if multiple areas detected
  if (item.area.length > 0 && !item.area.includes('uncategorized')) {
    confidence += 0.2;
  }

  // Higher confidence for items with clear metadata
  if (item.component || item.owner) {
    confidence += 0.1;
  }

  // Higher confidence for bug-bash items (structured)
  if (item.source === 'bugbash') {
    confidence += 0.15;
  }

  // Lower confidence for backlog items (they already have good structure)
  if (item.source === 'backlog') {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}

function sanitizeLabelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

function lowercaseFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Generate GitHub API payload for bulk label update
 */
export function generateGitHubLabelPayload(suggestion: LabelSuggestion): any {
  return {
    labels: suggestion.labels,
  };
}
