#!/usr/bin/env node

/**
 * Concern Router
 *
 * Routes patches to concerns using 4-stage routing:
 * 1. Pattern matching (file paths)
 * 2. Diff content analysis
 * 3. Metadata extraction
 * 4. Context analysis
 *
 * Ensures patches are directed to the correct frontier for convergence.
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

/**
 * Concern Router
 */
export class ConcernRouter {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.concernsFile = config.concernsFile || '.repoos/concerns.yml';
    this.concerns = null;
  }

  /**
   * Initialize router
   */
  async initialize() {
    await this.loadConcerns();
    console.log(`✅ Loaded ${Object.keys(this.concerns).length} concerns from registry`);
  }

  /**
   * Load concerns from registry
   */
  async loadConcerns() {
    const concernsPath = path.join(this.repoRoot, this.concernsFile);

    try {
      const content = await fs.readFile(concernsPath, 'utf8');
      const data = yaml.parse(content);
      this.concerns = data.concerns;
    } catch (error) {
      console.error('Failed to load concerns registry:', error.message);
      // Use default concerns
      this.concerns = {
        general: {
          description: 'General repository changes',
          patterns: ['*'],
          frontier_limit: 50,
          convergence_strategy: 'merge',
          priority: 'low'
        }
      };
    }
  }

  /**
   * Route patch to concern
   *
   * @param {Object} patch - Patch metadata
   * @returns {string} Concern ID
   */
  async routePatch(patch) {
    if (!this.concerns) {
      await this.initialize();
    }

    const {
      files_changed = [],
      diff = '',
      metadata = {}
    } = patch;

    console.log(`🔀 Routing patch ${patch.patch_id || 'unknown'}...`);

    // Stage 1: Pattern matching
    const patternMatch = this.matchByPattern(files_changed);
    if (patternMatch) {
      console.log(`   → Routed to concern: ${patternMatch}`);
      return patternMatch;
    }

    // Stage 2: Diff content analysis
    const diffMatch = this.analyzeDiffContent(diff);
    if (diffMatch) {
      console.log(`   → Routed to concern: ${diffMatch}`);
      return diffMatch;
    }

    // Stage 3: Metadata extraction
    const metadataMatch = this.analyzeMetadata(metadata);
    if (metadataMatch) {
      console.log(`   → Routed to concern: ${metadataMatch}`);
      return metadataMatch;
    }

    // Stage 4: Default to general
    console.log(`   → Routed to concern: general`);
    return 'general';
  }

  /**
   * Stage 1: Match by file patterns
   */
  matchByPattern(files) {
    for (const [concernId, concern] of Object.entries(this.concerns)) {
      const patterns = concern.patterns || [];

      for (const file of files) {
        for (const pattern of patterns) {
          if (this.matchPattern(file, pattern)) {
            return concernId;
          }
        }
      }
    }

    return null;
  }

  /**
   * Match file against glob-like pattern
   */
  matchPattern(file, pattern) {
    // Simple glob matching
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(file);
  }

  /**
   * Stage 2: Analyze diff content
   */
  analyzeDiffContent(diff) {
    // Look for keywords in diff content
    const keywords = {
      security: ['password', 'token', 'auth', 'crypto', 'security'],
      performance: ['optimize', 'cache', 'performance', 'perf'],
      test_stability: ['test', 'spec', '__tests__'],
      documentation: ['README', 'docs', 'documentation']
    };

    for (const [concernId, words] of Object.entries(keywords)) {
      if (this.concerns[concernId]) {
        for (const word of words) {
          if (diff.toLowerCase().includes(word.toLowerCase())) {
            return concernId;
          }
        }
      }
    }

    return null;
  }

  /**
   * Stage 3: Analyze metadata
   */
  analyzeMetadata(metadata) {
    // Check for concern hints in metadata
    if (metadata.concern) {
      if (this.concerns[metadata.concern]) {
        return metadata.concern;
      }
    }

    return null;
  }

  /**
   * Get concern configuration
   */
  async getConcernConfig(concernId) {
    if (!this.concerns) {
      await this.initialize();
    }

    return this.concerns[concernId] || this.concerns.general;
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const router = new ConcernRouter();
  await router.initialize();
  console.log('✅ Concern Router initialized');
}

export default ConcernRouter;
