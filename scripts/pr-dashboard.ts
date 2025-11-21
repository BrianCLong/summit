#!/usr/bin/env tsx

/**
 * PR Dashboard - Analyze and visualize PRs by category
 *
 * Analyzes git history to categorize and summarize pull requests by:
 * - Type: feature, bug, docs, dependencies, chore
 * - Status: merged (from git log)
 * - Time period: past 6 months
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PRData {
  hash: string;
  title: string;
  date: string;
  author: string;
  category: 'feature' | 'bug' | 'docs' | 'dependencies' | 'chore' | 'other';
  prNumber?: string;
}

interface CategoryStats {
  count: number;
  prs: PRData[];
}

interface DashboardData {
  totalPRs: number;
  categories: Record<string, CategoryStats>;
  timeRange: {
    start: string;
    end: string;
  };
  topContributors: Array<{ author: string; count: number }>;
}

/**
 * Categorize a PR based on its title/message
 */
function categorizePR(title: string): PRData['category'] {
  const lowerTitle = title.toLowerCase();

  // Check for dependency updates
  if (lowerTitle.includes('chore(deps)') || lowerTitle.includes('bump') ||
      lowerTitle.includes('update') && (lowerTitle.includes('dependencies') || lowerTitle.includes('package'))) {
    return 'dependencies';
  }

  // Check for features
  if (lowerTitle.startsWith('feat') || lowerTitle.includes('feature') ||
      lowerTitle.includes('add ') || lowerTitle.includes('enhance')) {
    return 'feature';
  }

  // Check for bugs/fixes
  if (lowerTitle.startsWith('fix') || lowerTitle.includes('bug') ||
      lowerTitle.includes('hotfix') || lowerTitle.includes('patch')) {
    return 'bug';
  }

  // Check for documentation
  if (lowerTitle.startsWith('docs') || lowerTitle.includes('documentation') ||
      lowerTitle.includes('readme')) {
    return 'docs';
  }

  // Check for chore
  if (lowerTitle.startsWith('chore') || lowerTitle.includes('refactor') ||
      lowerTitle.includes('test') || lowerTitle.includes('ci')) {
    return 'chore';
  }

  return 'other';
}

/**
 * Extract PR number from title
 */
function extractPRNumber(title: string): string | undefined {
  const match = title.match(/#(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Parse git log data
 */
function parseGitLog(logData: string): PRData[] {
  const lines = logData.trim().split('\n');
  const prs: PRData[] = [];

  for (const line of lines) {
    if (!line) continue;

    const [hash, title, date, author] = line.split('|');
    if (!hash || !title) continue;

    const pr: PRData = {
      hash: hash.trim(),
      title: title.trim(),
      date: date?.trim() || '',
      author: author?.trim() || 'Unknown',
      category: categorizePR(title),
      prNumber: extractPRNumber(title),
    };

    prs.push(pr);
  }

  return prs;
}

/**
 * Analyze PRs and generate dashboard data
 */
function analyzePRs(prs: PRData[]): DashboardData {
  const categories: Record<string, CategoryStats> = {
    feature: { count: 0, prs: [] },
    bug: { count: 0, prs: [] },
    docs: { count: 0, prs: [] },
    dependencies: { count: 0, prs: [] },
    chore: { count: 0, prs: [] },
    other: { count: 0, prs: [] },
  };

  const authorCounts: Record<string, number> = {};

  // Categorize PRs and count authors
  for (const pr of prs) {
    categories[pr.category].count++;
    categories[pr.category].prs.push(pr);

    authorCounts[pr.author] = (authorCounts[pr.author] || 0) + 1;
  }

  // Get date range
  const dates = prs.map(pr => new Date(pr.date)).filter(d => !isNaN(d.getTime()));
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());

  // Get top contributors
  const topContributors = Object.entries(authorCounts)
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalPRs: prs.length,
    categories,
    timeRange: {
      start: sortedDates[0]?.toISOString().split('T')[0] || 'N/A',
      end: sortedDates[sortedDates.length - 1]?.toISOString().split('T')[0] || 'N/A',
    },
    topContributors,
  };
}

/**
 * Generate visual bar chart
 */
function generateBarChart(value: number, max: number, width: number = 40): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Render dashboard to console
 */
function renderDashboard(data: DashboardData): void {
  const maxCount = Math.max(...Object.values(data.categories).map(c => c.count));

  console.log('\n' + '='.repeat(80));
  console.log('  PR DASHBOARD - Past 6 Months Summary');
  console.log('='.repeat(80));
  console.log();

  console.log(`📊 Overview:`);
  console.log(`   Total PRs: ${data.totalPRs}`);
  console.log(`   Date Range: ${data.timeRange.start} to ${data.timeRange.end}`);
  console.log();

  console.log('📈 PRs by Category:');
  console.log();

  const categoryEmojis: Record<string, string> = {
    feature: '✨',
    bug: '🐛',
    docs: '📚',
    dependencies: '📦',
    chore: '🔧',
    other: '📝',
  };

  const categoryOrder = ['feature', 'bug', 'docs', 'dependencies', 'chore', 'other'];

  for (const category of categoryOrder) {
    const stats = data.categories[category];
    const emoji = categoryEmojis[category] || '•';
    const percentage = ((stats.count / data.totalPRs) * 100).toFixed(1);
    const bar = generateBarChart(stats.count, maxCount, 40);

    console.log(`  ${emoji} ${category.padEnd(15)} ${stats.count.toString().padStart(4)} (${percentage.padStart(5)}%)  ${bar}`);
  }

  console.log();
  console.log('👥 Top Contributors:');
  console.log();

  data.topContributors.slice(0, 5).forEach((contributor, index) => {
    const percentage = ((contributor.count / data.totalPRs) * 100).toFixed(1);
    const bar = generateBarChart(contributor.count, data.topContributors[0].count, 30);
    console.log(`  ${(index + 1).toString().padStart(2)}. ${contributor.author.padEnd(30)} ${contributor.count.toString().padStart(4)} (${percentage.padStart(5)}%)  ${bar}`);
  });

  console.log();
  console.log('📋 Recent PRs by Category:');
  console.log();

  for (const category of categoryOrder) {
    const stats = data.categories[category];
    if (stats.count === 0) continue;

    const emoji = categoryEmojis[category] || '•';
    console.log(`  ${emoji} ${category.toUpperCase()} (${stats.count} total):`);

    // Show up to 5 most recent PRs
    const recentPRs = stats.prs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    for (const pr of recentPRs) {
      const dateStr = new Date(pr.date).toISOString().split('T')[0];
      const prNum = pr.prNumber ? `#${pr.prNumber}` : '';
      const titlePreview = pr.title.substring(0, 80) + (pr.title.length > 80 ? '...' : '');
      console.log(`     ${prNum.padEnd(8)} ${dateStr}  ${titlePreview}`);
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log();
}

/**
 * Save dashboard data to JSON
 */
function saveDashboardData(data: DashboardData, outputPath: string): void {
  // Prepare simplified data for JSON export
  const jsonData = {
    summary: {
      totalPRs: data.totalPRs,
      timeRange: data.timeRange,
      categoryCounts: Object.fromEntries(
        Object.entries(data.categories).map(([cat, stats]) => [cat, stats.count])
      ),
    },
    categories: Object.fromEntries(
      Object.entries(data.categories).map(([cat, stats]) => [
        cat,
        {
          count: stats.count,
          prs: stats.prs.map(pr => ({
            prNumber: pr.prNumber,
            title: pr.title,
            date: pr.date,
            author: pr.author,
          })),
        },
      ])
    ),
    topContributors: data.topContributors,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
  console.log(`📄 Dashboard data saved to: ${outputPath}`);
}

/**
 * Main function
 */
function main(): void {
  try {
    console.log('Analyzing PR data from git history...');

    // Fetch git log data (past 6 months)
    const gitLogCommand = `git log --since="6 months ago" --grep="Merge pull request\\|^feat\\|^fix\\|^docs\\|^chore" --pretty=format:"%H|%s|%ai|%an" --all`;

    const logData = execSync(gitLogCommand, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse and analyze
    const prs = parseGitLog(logData);
    const dashboardData = analyzePRs(prs);

    // Render dashboard
    renderDashboard(dashboardData);

    // Save to JSON
    const outputPath = path.join(process.cwd(), 'pr-dashboard-report.json');
    saveDashboardData(dashboardData, outputPath);

  } catch (error) {
    console.error('Error generating PR dashboard:', error);
    process.exit(1);
  }
}

// Run if called directly (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { analyzePRs, parseGitLog, categorizePR, DashboardData, PRData };
