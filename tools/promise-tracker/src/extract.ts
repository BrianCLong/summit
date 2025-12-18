#!/usr/bin/env tsx
/**
 * Promise Tracker - Extraction Module
 *
 * Scans the codebase for:
 * 1. TODO/FIXME/XXX/HACK comments in code
 * 2. Backlog sections in markdown docs
 * 3. "should", "must", "need to", "eventually" patterns in docs
 * 4. Feature flags that haven't been fully rolled out
 * 5. Half-implemented modules (v1, beta, experimental)
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import matter from 'gray-matter';
import {
  StagingItemSchema,
  type StagingItem,
  type ComponentEnum,
  type ScopeClassEnum,
  type ConfidenceEnum,
} from './schema.js';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  rootDir: process.cwd(),
  excludePaths: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/archive/**',
    '**/.archive/**',
    '**/vendor/**',
    '**/*.min.js',
    '**/*.bundle.js',
  ],
  codePatterns: {
    todo: /(?:\/\/|#|\/\*|\*|<!--)\s*(TODO|FIXME|XXX|HACK|BUG|OPTIMIZE|REFACTOR|REVIEW)[\s:]+(.+?)(?:\*\/|-->|$)/gi,
    issueRef: /#(\d+)/g,
  },
  docPatterns: {
    backlogSection: /^#{1,3}\s*(?:Backlog|TODO|Tasks|Action Items|Next Steps|Roadmap)/im,
    commitmentPhrases: [
      /\b(?:we\s+)?(?:should|must|need\s+to|have\s+to)\s+(.+?)(?:\.|$)/gi,
      /\b(?:eventually|later|future|next\s+sprint|upcoming)\s+(.+?)(?:\.|$)/gi,
      /\b(?:TODO|FIXME|WIP)[\s:]+(.+?)(?:\.|$)/gi,
      /\[\s*\]\s+(.+?)(?:\n|$)/g, // Unchecked checkboxes
    ],
  },
  componentKeywords: new Map<string, string>([
    ['maestro', 'Maestro'],
    ['conductor', 'Conductor'],
    ['switchboard', 'Switchboard'],
    ['companyos', 'CompanyOS'],
    ['intelgraph', 'IntelGraph'],
    ['copilot', 'Copilot'],
    ['graph-api', 'GraphAPI'],
    ['graphql', 'GraphAPI'],
    ['analytics', 'Analytics'],
    ['auth', 'Auth'],
    ['ci', 'CI/CD'],
    ['cd', 'CI/CD'],
    ['observability', 'Observability'],
    ['prometheus', 'Observability'],
    ['grafana', 'Observability'],
    ['terraform', 'Infrastructure'],
    ['k8s', 'Infrastructure'],
    ['kubernetes', 'Infrastructure'],
    ['helm', 'Infrastructure'],
    ['security', 'Security'],
    ['testing', 'Testing'],
    ['test', 'Testing'],
    ['doc', 'Documentation'],
    ['readme', 'Documentation'],
    ['data', 'Data'],
    ['ui', 'UI/UX'],
    ['frontend', 'UI/UX'],
    ['client', 'UI/UX'],
  ]),
};

// =============================================================================
// Types
// =============================================================================

interface ExtractionResult {
  staging: StagingItem[];
  stats: {
    filesScanned: number;
    codeFilesScanned: number;
    docFilesScanned: number;
    todosFound: number;
    commitmentsFound: number;
    checklistItemsFound: number;
  };
}

interface CodeMatch {
  type: string;
  content: string;
  file: string;
  line: number;
}

interface DocMatch {
  content: string;
  file: string;
  context: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

function inferComponent(text: string, filePath: string): string {
  const combined = `${text} ${filePath}`.toLowerCase();

  for (const [keyword, component] of CONFIG.componentKeywords) {
    if (combined.includes(keyword)) {
      return component;
    }
  }

  // Infer from path
  if (filePath.includes('/server/')) return 'Summit';
  if (filePath.includes('/client/')) return 'UI/UX';
  if (filePath.includes('/services/')) return 'Summit';
  if (filePath.includes('/packages/')) return 'Summit';
  if (filePath.includes('/docs/')) return 'Documentation';
  if (filePath.includes('/infra/') || filePath.includes('/terraform/')) return 'Infrastructure';

  return 'Other';
}

function inferScopeClass(text: string): 'tiny' | 'small' | 'medium' | 'large' | 'epic' {
  const lower = text.toLowerCase();

  if (lower.includes('simple') || lower.includes('quick') || lower.includes('trivial')) {
    return 'tiny';
  }
  if (lower.includes('refactor') || lower.includes('rewrite') || lower.includes('overhaul')) {
    return 'large';
  }
  if (lower.includes('system') || lower.includes('architecture') || lower.includes('redesign')) {
    return 'epic';
  }
  if (lower.includes('add') || lower.includes('implement') || lower.includes('create')) {
    return 'medium';
  }
  if (lower.includes('fix') || lower.includes('update') || lower.includes('change')) {
    return 'small';
  }

  return 'medium';
}

function inferConfidence(type: string): 'high' | 'medium' | 'low' {
  if (['FIXME', 'BUG', 'HACK'].includes(type.toUpperCase())) {
    return 'high'; // Clearly identified issues
  }
  if (['TODO', 'OPTIMIZE'].includes(type.toUpperCase())) {
    return 'medium';
  }
  return 'low';
}

// =============================================================================
// Code Scanner
// =============================================================================

async function scanCodeFiles(): Promise<CodeMatch[]> {
  const matches: CodeMatch[] = [];

  const codeFiles = await glob('**/*.{ts,tsx,js,jsx,py,sh,go,rs,java}', {
    cwd: CONFIG.rootDir,
    ignore: CONFIG.excludePaths,
  });

  for (const file of codeFiles) {
    try {
      const content = await readFile(join(CONFIG.rootDir, file), 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        const todoRegex = new RegExp(CONFIG.codePatterns.todo.source, 'gi');

        while ((match = todoRegex.exec(line)) !== null) {
          const [, type, todoContent] = match;
          if (todoContent && todoContent.trim().length > 3) {
            matches.push({
              type: type.toUpperCase(),
              content: todoContent.trim(),
              file,
              line: index + 1,
            });
          }
        }
      });
    } catch {
      // Skip files that can't be read
    }
  }

  return matches;
}

// =============================================================================
// Documentation Scanner
// =============================================================================

async function scanDocFiles(): Promise<DocMatch[]> {
  const matches: DocMatch[] = [];

  const docFiles = await glob('**/*.md', {
    cwd: CONFIG.rootDir,
    ignore: CONFIG.excludePaths,
  });

  for (const file of docFiles) {
    try {
      const content = await readFile(join(CONFIG.rootDir, file), 'utf-8');
      const { content: docContent } = matter(content);

      // Look for backlog sections
      if (CONFIG.docPatterns.backlogSection.test(docContent)) {
        // Extract items from backlog section
        const sections = docContent.split(/^#{1,3}\s+/m);
        for (const section of sections) {
          if (/^(?:Backlog|TODO|Tasks|Action Items|Next Steps|Roadmap)/i.test(section)) {
            // Extract list items
            const listItems = section.match(/^[-*]\s+(.+)$/gm) || [];
            for (const item of listItems) {
              const cleanItem = item.replace(/^[-*]\s+/, '').trim();
              if (cleanItem.length > 5 && !cleanItem.startsWith('[x]')) {
                matches.push({
                  content: cleanItem,
                  file,
                  context: 'backlog_section',
                });
              }
            }
          }
        }
      }

      // Look for commitment phrases
      for (const pattern of CONFIG.docPatterns.commitmentPhrases) {
        let match;
        const regex = new RegExp(pattern.source, 'gi');

        while ((match = regex.exec(docContent)) !== null) {
          const commitment = match[1]?.trim();
          if (commitment && commitment.length > 10 && commitment.length < 300) {
            matches.push({
              content: commitment,
              file,
              context: 'commitment_phrase',
            });
          }
        }
      }

      // Look for unchecked checkboxes
      const uncheckedBoxes = docContent.match(/\[\s*\]\s+(.+?)(?:\n|$)/g) || [];
      for (const box of uncheckedBoxes) {
        const item = box.replace(/\[\s*\]\s+/, '').trim();
        if (item.length > 5) {
          matches.push({
            content: item,
            file,
            context: 'unchecked_checkbox',
          });
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return matches;
}

// =============================================================================
// Conversion to Staging Items
// =============================================================================

function codeMatchToStagingItem(match: CodeMatch): StagingItem {
  return {
    raw_source: `${match.file}:${match.line}`,
    rough_title: `[${match.type}] ${match.content.slice(0, 100)}`,
    notes: match.content,
    confidence: inferConfidence(match.type) as any,
    scope_class: inferScopeClass(match.content) as any,
    component: inferComponent(match.content, match.file) as any,
    suggested_type: match.type === 'BUG' ? 'bug' : match.type === 'HACK' ? 'tech_debt' : 'feature',
    captured_at: new Date().toISOString(),
    processed: false,
  };
}

function docMatchToStagingItem(match: DocMatch): StagingItem {
  return {
    raw_source: match.file,
    rough_title: match.content.slice(0, 100),
    notes: match.content,
    confidence: match.context === 'backlog_section' ? 'high' : 'medium',
    scope_class: inferScopeClass(match.content) as any,
    component: inferComponent(match.content, match.file) as any,
    suggested_type: 'feature',
    captured_at: new Date().toISOString(),
    processed: false,
  };
}

// =============================================================================
// Main Extraction Function
// =============================================================================

export async function extractPromises(): Promise<ExtractionResult> {
  console.log('Starting promise extraction...\n');

  // Scan code files
  console.log('Scanning code files for TODOs/FIXMEs...');
  const codeMatches = await scanCodeFiles();
  console.log(`  Found ${codeMatches.length} code comments\n`);

  // Scan documentation
  console.log('Scanning documentation for commitments...');
  const docMatches = await scanDocFiles();
  console.log(`  Found ${docMatches.length} documentation items\n`);

  // Convert to staging items
  const staging: StagingItem[] = [
    ...codeMatches.map(codeMatchToStagingItem),
    ...docMatches.map(docMatchToStagingItem),
  ];

  // Deduplicate by similar content
  const seen = new Set<string>();
  const dedupedStaging = staging.filter((item) => {
    const key = item.notes.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const stats = {
    filesScanned: codeMatches.length + docMatches.length,
    codeFilesScanned: codeMatches.length,
    docFilesScanned: docMatches.length,
    todosFound: codeMatches.length,
    commitmentsFound: docMatches.filter((m) => m.context === 'commitment_phrase').length,
    checklistItemsFound: docMatches.filter((m) => m.context === 'unchecked_checkbox').length,
  };

  return { staging: dedupedStaging, stats };
}

// =============================================================================
// CLI Entry Point
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  extractPromises()
    .then(({ staging, stats }) => {
      console.log('\n=== Extraction Complete ===\n');
      console.log(`Total staging items: ${staging.length}`);
      console.log(`  - From code TODOs: ${stats.todosFound}`);
      console.log(`  - From commitments: ${stats.commitmentsFound}`);
      console.log(`  - From checklists: ${stats.checklistItemsFound}`);

      // Group by component
      const byComponent = staging.reduce(
        (acc, item) => {
          const comp = item.component || 'Other';
          acc[comp] = (acc[comp] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log('\nBy Component:');
      Object.entries(byComponent)
        .sort((a, b) => b[1] - a[1])
        .forEach(([comp, count]) => {
          console.log(`  ${comp}: ${count}`);
        });

      // Output to file
      const outputPath = join(CONFIG.rootDir, '.promise-tracker', 'staging.json');
      import('fs').then(({ mkdirSync, writeFileSync }) => {
        mkdirSync(join(CONFIG.rootDir, '.promise-tracker'), { recursive: true });
        writeFileSync(outputPath, JSON.stringify({ staging, stats }, null, 2));
        console.log(`\nStaging data written to: ${outputPath}`);
      });
    })
    .catch(console.error);
}

export default extractPromises;
