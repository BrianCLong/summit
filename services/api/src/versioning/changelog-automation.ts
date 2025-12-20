/**
 * API Changelog Automation
 * Automatically tracks and generates API changelogs
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { versionRegistry, ChangelogEntry } from './version-registry.js';
import { logger } from '../utils/logger.js';
import { DateTime } from 'luxon';

export interface ChangelogConfig {
  includeBreaking: boolean;
  includeFeatures: boolean;
  includeFixes: boolean;
  includeDeprecations: boolean;
  includeSecurity: boolean;
  format: 'markdown' | 'json' | 'html';
  groupByType: boolean;
  sortByDate: boolean;
}

export interface GeneratedChangelog {
  version: string;
  entries: ChangelogEntry[];
  generatedAt: Date;
  markdown?: string;
  html?: string;
  json?: string;
}

class ChangelogAutomation {
  private defaultConfig: ChangelogConfig = {
    includeBreaking: true,
    includeFeatures: true,
    includeFixes: true,
    includeDeprecations: true,
    includeSecurity: true,
    format: 'markdown',
    groupByType: true,
    sortByDate: true,
  };

  /**
   * Generate changelog for a specific version
   */
  generateChangelog(
    version: string,
    config?: Partial<ChangelogConfig>,
  ): GeneratedChangelog | null {
    const versionInfo = versionRegistry.getVersion(version);
    if (!versionInfo) {
      logger.warn({ message: 'Version not found for changelog', version });
      return null;
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    let entries = versionInfo.changelog;

    // Filter by type
    entries = this.filterEntries(entries, finalConfig);

    // Sort
    if (finalConfig.sortByDate) {
      entries = entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    const changelog: GeneratedChangelog = {
      version,
      entries,
      generatedAt: new Date(),
    };

    // Generate in requested format
    switch (finalConfig.format) {
      case 'markdown':
        changelog.markdown = this.generateMarkdown(version, entries, finalConfig);
        break;
      case 'json':
        changelog.json = this.generateJSON(version, entries);
        break;
      case 'html':
        changelog.html = this.generateHTML(version, entries, finalConfig);
        break;
    }

    return changelog;
  }

  /**
   * Generate changelog for all versions
   */
  generateFullChangelog(config?: Partial<ChangelogConfig>): string {
    const versions = versionRegistry.getAllVersions();
    let fullChangelog = '# IntelGraph API Changelog\n\n';
    fullChangelog += `Last updated: ${DateTime.now().toFormat('yyyy-MM-dd')}\n\n`;

    for (const version of versions) {
      const changelog = this.generateChangelog(version.version, config);
      if (changelog?.markdown) {
        fullChangelog += changelog.markdown + '\n\n';
      }
    }

    return fullChangelog;
  }

  /**
   * Filter changelog entries based on config
   */
  private filterEntries(
    entries: ChangelogEntry[],
    config: ChangelogConfig,
  ): ChangelogEntry[] {
    return entries.filter((entry) => {
      switch (entry.type) {
        case 'breaking':
          return config.includeBreaking;
        case 'feature':
          return config.includeFeatures;
        case 'fix':
          return config.includeFixes;
        case 'deprecation':
          return config.includeDeprecations;
        case 'security':
          return config.includeSecurity;
        default:
          return true;
      }
    });
  }

  /**
   * Generate markdown changelog
   */
  private generateMarkdown(
    version: string,
    entries: ChangelogEntry[],
    config: ChangelogConfig,
  ): string {
    const versionInfo = versionRegistry.getVersion(version);
    if (!versionInfo) return '';

    let markdown = `## ${version} - ${DateTime.fromJSDate(versionInfo.releaseDate).toFormat('yyyy-MM-dd')}\n\n`;

    if (versionInfo.status === 'deprecated') {
      markdown += `> **⚠️ DEPRECATED**: This version is deprecated`;
      if (versionInfo.sunsetDate) {
        markdown += ` and will be sunset on ${DateTime.fromJSDate(versionInfo.sunsetDate).toFormat('yyyy-MM-dd')}`;
      }
      markdown += `\n\n`;
    }

    if (versionInfo.status === 'sunset') {
      markdown += `> **🚫 SUNSET**: This version is no longer supported\n\n`;
    }

    if (config.groupByType) {
      // Group by type
      const grouped = this.groupEntriesByType(entries);

      // Breaking changes first
      if (grouped.breaking.length > 0) {
        markdown += `### ⚠️ Breaking Changes\n\n`;
        for (const entry of grouped.breaking) {
          markdown += this.formatMarkdownEntry(entry);
        }
      }

      // Security fixes
      if (grouped.security.length > 0) {
        markdown += `### 🔒 Security\n\n`;
        for (const entry of grouped.security) {
          markdown += this.formatMarkdownEntry(entry);
        }
      }

      // Features
      if (grouped.feature.length > 0) {
        markdown += `### ✨ Features\n\n`;
        for (const entry of grouped.feature) {
          markdown += this.formatMarkdownEntry(entry);
        }
      }

      // Fixes
      if (grouped.fix.length > 0) {
        markdown += `### 🐛 Bug Fixes\n\n`;
        for (const entry of grouped.fix) {
          markdown += this.formatMarkdownEntry(entry);
        }
      }

      // Deprecations
      if (grouped.deprecation.length > 0) {
        markdown += `### 📢 Deprecations\n\n`;
        for (const entry of grouped.deprecation) {
          markdown += this.formatMarkdownEntry(entry);
        }
      }
    } else {
      // Flat list
      for (const entry of entries) {
        markdown += this.formatMarkdownEntry(entry);
      }
    }

    return markdown;
  }

  /**
   * Format a single changelog entry as markdown
   */
  private formatMarkdownEntry(entry: ChangelogEntry): string {
    let line = `- ${entry.description}`;

    if (entry.ticket) {
      line += ` ([${entry.ticket}](https://github.com/BrianCLong/summit/issues/${entry.ticket.replace('#', '')}))`;
    }

    if (entry.migration) {
      line += `\n  - **Migration:** ${entry.migration}`;
    }

    line += '\n';
    return line;
  }

  /**
   * Group entries by type
   */
  private groupEntriesByType(entries: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
    return entries.reduce(
      (acc, entry) => {
        if (!acc[entry.type]) {
          acc[entry.type] = [];
        }
        acc[entry.type].push(entry);
        return acc;
      },
      {
        breaking: [],
        security: [],
        feature: [],
        fix: [],
        deprecation: [],
      } as Record<string, ChangelogEntry[]>,
    );
  }

  /**
   * Generate JSON changelog
   */
  private generateJSON(version: string, entries: ChangelogEntry[]): string {
    const versionInfo = versionRegistry.getVersion(version);

    return JSON.stringify(
      {
        version,
        status: versionInfo?.status,
        releaseDate: versionInfo?.releaseDate,
        deprecationDate: versionInfo?.deprecationDate,
        sunsetDate: versionInfo?.sunsetDate,
        changes: entries.map((e) => ({
          type: e.type,
          description: e.description,
          date: e.date,
          ticket: e.ticket,
          migration: e.migration,
        })),
      },
      null,
      2,
    );
  }

  /**
   * Generate HTML changelog
   */
  private generateHTML(
    version: string,
    entries: ChangelogEntry[],
    config: ChangelogConfig,
  ): string {
    const versionInfo = versionRegistry.getVersion(version);
    if (!versionInfo) return '';

    let html = `<div class="changelog-version">\n`;
    html += `  <h2>${version} <span class="release-date">${DateTime.fromJSDate(versionInfo.releaseDate).toFormat('yyyy-MM-dd')}</span></h2>\n`;

    if (versionInfo.status === 'deprecated') {
      html += `  <div class="alert alert-warning">`;
      html += `<strong>⚠️ DEPRECATED:</strong> This version is deprecated`;
      if (versionInfo.sunsetDate) {
        html += ` and will be sunset on ${DateTime.fromJSDate(versionInfo.sunsetDate).toFormat('yyyy-MM-dd')}`;
      }
      html += `</div>\n`;
    }

    if (config.groupByType) {
      const grouped = this.groupEntriesByType(entries);

      for (const [type, typeEntries] of Object.entries(grouped)) {
        if (typeEntries.length === 0) continue;

        const icons = {
          breaking: '⚠️',
          security: '🔒',
          feature: '✨',
          fix: '🐛',
          deprecation: '📢',
        };

        const titles = {
          breaking: 'Breaking Changes',
          security: 'Security',
          feature: 'Features',
          fix: 'Bug Fixes',
          deprecation: 'Deprecations',
        };

        html += `  <h3>${icons[type as keyof typeof icons] || ''} ${titles[type as keyof typeof titles] || type}</h3>\n`;
        html += `  <ul>\n`;

        for (const entry of typeEntries) {
          html += `    <li>${this.escapeHtml(entry.description)}`;
          if (entry.ticket) {
            html += ` <a href="https://github.com/BrianCLong/summit/issues/${entry.ticket.replace('#', '')}">${entry.ticket}</a>`;
          }
          if (entry.migration) {
            html += `<br><em>Migration: ${this.escapeHtml(entry.migration)}</em>`;
          }
          html += `</li>\n`;
        }

        html += `  </ul>\n`;
      }
    } else {
      html += `  <ul>\n`;
      for (const entry of entries) {
        html += `    <li><strong>${entry.type}:</strong> ${this.escapeHtml(entry.description)}</li>\n`;
      }
      html += `  </ul>\n`;
    }

    html += `</div>\n`;
    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Generate changelog from Git commits
   * Parses conventional commit messages
   */
  async generateFromGitCommits(
    fromTag: string,
    toTag: string = 'HEAD',
  ): Promise<ChangelogEntry[]> {
    // This would integrate with Git to parse commits
    // For now, return empty array as example
    logger.info({
      message: 'Generating changelog from Git commits',
      fromTag,
      toTag,
    });

    // Example implementation would use git log and parse:
    // - feat: -> feature
    // - fix: -> fix
    // - BREAKING CHANGE: -> breaking
    // - security: -> security

    return [];
  }

  /**
   * Add a changelog entry to a version
   */
  addEntry(version: string, entry: Omit<ChangelogEntry, 'date'>): void {
    const versionInfo = versionRegistry.getVersion(version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    const fullEntry: ChangelogEntry = {
      ...entry,
      date: new Date(),
    };

    versionInfo.changelog.push(fullEntry);

    logger.info({
      message: 'Added changelog entry',
      version,
      type: entry.type,
      description: entry.description,
    });
  }

  /**
   * Export changelog to file
   */
  exportChangelog(
    version: string,
    filePath: string,
    format: 'markdown' | 'json' | 'html' = 'markdown',
  ): void {
    const changelog = this.generateChangelog(version, { format });
    if (!changelog) {
      throw new Error(`Failed to generate changelog for version ${version}`);
    }

    let content = '';
    switch (format) {
      case 'markdown':
        content = changelog.markdown || '';
        break;
      case 'json':
        content = changelog.json || '';
        break;
      case 'html':
        content = changelog.html || '';
        break;
    }

    logger.info({
      message: 'Changelog exported',
      version,
      format,
      filePath,
    });

    // In a real implementation, write to file
    // fs.writeFileSync(filePath, content, 'utf-8');
  }
}

// Singleton instance
export const changelogAutomation = new ChangelogAutomation();
