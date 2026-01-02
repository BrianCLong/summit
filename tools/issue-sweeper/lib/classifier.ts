/**
 * Issue classification logic
 */

import { GitHubIssue, IssueClassification } from './types.js';

/**
 * Classify an issue based on title, body, and labels
 */
export function classifyIssue(issue: GitHubIssue): IssueClassification {
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();
  const labels = issue.labels.map((l) => l.name.toLowerCase());

  // Check labels first (most reliable)
  if (labels.some((l) => l.includes('security') || l.includes('vulnerability'))) {
    return 'security';
  }
  if (labels.some((l) => l.includes('bug') || l.includes('defect'))) {
    return 'bug';
  }
  if (labels.some((l) => l.includes('feature') || l.includes('enhancement'))) {
    return 'feature';
  }
  if (labels.some((l) => l.includes('documentation') || l.includes('docs'))) {
    return 'docs';
  }
  if (labels.some((l) => l.includes('question') || l.includes('help'))) {
    return 'question';
  }
  if (labels.some((l) => l.includes('ci') || l.includes('cd') || l.includes('workflow'))) {
    return 'ci';
  }
  if (labels.some((l) => l.includes('performance') || l.includes('perf'))) {
    return 'perf';
  }
  if (labels.some((l) => l.includes('refactor') || l.includes('cleanup'))) {
    return 'refactor';
  }

  // Title/body keywords
  const combinedText = `${title} ${body}`;

  if (/\b(bug|error|fail|crash|broken|issue|problem)\b/.test(combinedText)) {
    return 'bug';
  }
  if (/\b(feature|add|implement|support|allow|enable)\b/.test(combinedText)) {
    return 'feature';
  }
  if (/\b(doc|documentation|readme|guide|tutorial)\b/.test(combinedText)) {
    return 'docs';
  }
  if (/\b(question|how to|help|clarification)\b/.test(combinedText)) {
    return 'question';
  }
  if (/\b(security|vulnerability|cve|exploit|xss|injection)\b/.test(combinedText)) {
    return 'security';
  }
  if (/\b(ci|workflow|github action|build|deploy)\b/.test(combinedText)) {
    return 'ci';
  }
  if (/\b(performance|slow|optimization|speed|latency)\b/.test(combinedText)) {
    return 'perf';
  }
  if (/\b(refactor|cleanup|improve|reorganize)\b/.test(combinedText)) {
    return 'refactor';
  }

  return 'unknown';
}

/**
 * Extract keywords from issue for searching
 */
export function extractKeywords(issue: GitHubIssue): string[] {
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();

  // Remove common words
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
  ]);

  const words = `${title} ${body}`
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, ''))
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Return top 5 most meaningful keywords
  return Array.from(new Set(words)).slice(0, 5);
}
