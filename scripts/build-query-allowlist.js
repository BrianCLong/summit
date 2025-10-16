#!/usr/bin/env node
/**
 * Build GraphQL Query Allowlist
 * Extracts queries from client code and generates production allowlist
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');

// Configuration
const CLIENT_DIR = process.env.CLIENT_DIR || './client';
const OUTPUT_FILE =
  process.env.ALLOWLIST_OUTPUT || './server/config/query-allowlist.json';
const QUERY_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.graphql',
  '**/*.gql',
];

// GraphQL query extraction patterns
const QUERY_REGEX =
  /(?:gql`|query\s*=\s*`|mutation\s*=\s*`|graphql\s*`)([\s\S]*?)(?:`)/g;
const TEMPLATE_LITERAL_REGEX = /`((?:[^`\\]|\\.)*)(`)/g;

class QueryAllowlistBuilder {
  constructor() {
    this.queries = new Set();
    this.hashes = new Set();
  }

  /**
   * Extract GraphQL queries from client source files
   */
  extractQueries() {
    console.log('🔍 Extracting GraphQL queries from client code...');

    for (const pattern of QUERY_PATTERNS) {
      const files = glob.sync(path.join(CLIENT_DIR, pattern), {
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/*.test.*',
          '**/*.spec.*',
        ],
      });

      for (const file of files) {
        this.processFile(file);
      }
    }

    console.log(`📊 Found ${this.queries.size} unique queries`);
  }

  /**
   * Process individual file for GraphQL queries
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const extension = path.extname(filePath);

      // Different extraction strategies based on file type
      switch (extension) {
        case '.graphql':
        case '.gql':
          this.extractFromGraphQLFile(content, filePath);
          break;
        default:
          this.extractFromSourceFile(content, filePath);
          break;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract queries from .graphql files
   */
  extractFromGraphQLFile(content, filePath) {
    const queries = this.splitGraphQLDocument(content);

    for (const query of queries) {
      const normalized = this.normalizeQuery(query);
      if (normalized && this.isValidQuery(normalized)) {
        this.queries.add(normalized);
        console.log(
          `📝 Found query in ${path.basename(filePath)}: ${this.getQueryName(normalized) || 'Anonymous'}`,
        );
      }
    }
  }

  /**
   * Extract queries from TypeScript/JavaScript source files
   */
  extractFromSourceFile(content, filePath) {
    let match;

    // Extract template literals with GraphQL content
    QUERY_REGEX.lastIndex = 0;
    while ((match = QUERY_REGEX.exec(content)) !== null) {
      const queryContent = match[1];
      const normalized = this.normalizeQuery(queryContent);

      if (normalized && this.isValidQuery(normalized)) {
        this.queries.add(normalized);
        console.log(
          `📝 Found query in ${path.basename(filePath)}: ${this.getQueryName(normalized) || 'Anonymous'}`,
        );
      }
    }
  }

  /**
   * Split GraphQL document into individual operations
   */
  splitGraphQLDocument(content) {
    const queries = [];
    const lines = content.split('\n');
    let currentQuery = '';
    let inOperation = false;
    let braceCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || !trimmed) {
        continue;
      }

      // Check for operation start
      if (trimmed.match(/^(query|mutation|subscription)/i)) {
        if (currentQuery && inOperation) {
          queries.push(currentQuery.trim());
        }
        currentQuery = line + '\n';
        inOperation = true;
        braceCount =
          (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (inOperation) {
        currentQuery += line + '\n';
        braceCount +=
          (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceCount === 0) {
          queries.push(currentQuery.trim());
          currentQuery = '';
          inOperation = false;
        }
      }
    }

    if (currentQuery && inOperation) {
      queries.push(currentQuery.trim());
    }

    return queries;
  }

  /**
   * Normalize GraphQL query for consistent hashing
   */
  normalizeQuery(query) {
    if (!query || typeof query !== 'string') {
      return null;
    }

    return query
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/#[^\n\r]*/g, '') // Remove comments
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .trim();
  }

  /**
   * Check if string appears to be a valid GraphQL query
   */
  isValidQuery(query) {
    const hasOperation = /^\s*(query|mutation|subscription)/i.test(query);
    const hasBasicStructure = query.includes('{') && query.includes('}');
    const minLength = query.length > 10;

    return hasOperation && hasBasicStructure && minLength;
  }

  /**
   * Extract query name from GraphQL operation
   */
  getQueryName(query) {
    const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Generate SHA-256 hashes for all queries
   */
  generateHashes() {
    console.log('🔐 Generating SHA-256 hashes...');

    for (const query of this.queries) {
      const hash = crypto.createHash('sha256').update(query).digest('hex');
      this.hashes.add(hash);
    }

    console.log(`🔒 Generated ${this.hashes.size} unique hashes`);
  }

  /**
   * Write allowlist to output file
   */
  writeAllowlist() {
    const allowlist = {
      generated: new Date().toISOString(),
      buildSha: process.env.BUILD_SHA || 'unknown',
      totalQueries: this.queries.size,
      queries: Array.from(this.queries).sort(),
      hashes: Array.from(this.hashes).sort(),
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allowlist, null, 2));
    console.log(`✅ Allowlist written to ${OUTPUT_FILE}`);

    // Write environment variable file
    const envFile = OUTPUT_FILE.replace('.json', '.env');
    const envContent = `GQL_SHA256_ALLOWLIST=${JSON.stringify(Array.from(this.hashes))}\n`;
    fs.writeFileSync(envFile, envContent);
    console.log(`📄 Environment file written to ${envFile}`);
  }

  /**
   * Validate allowlist against known patterns
   */
  validate() {
    const issues = [];

    // Check for overly complex queries
    for (const query of this.queries) {
      const depth = this.calculateDepth(query);
      if (depth > 10) {
        issues.push(
          `Query exceeds recommended depth (${depth}): ${this.getQueryName(query) || 'Anonymous'}`,
        );
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['__schema', '__type', 'IntrospectionQuery'];
    for (const query of this.queries) {
      for (const pattern of suspiciousPatterns) {
        if (query.includes(pattern)) {
          issues.push(
            `Query contains introspection: ${this.getQueryName(query) || 'Anonymous'}`,
          );
        }
      }
    }

    if (issues.length > 0) {
      console.warn('⚠️  Validation issues found:');
      for (const issue of issues) {
        console.warn(`   ${issue}`);
      }
    }

    return issues;
  }

  /**
   * Calculate GraphQL query depth
   */
  calculateDepth(query) {
    let depth = 0;
    let maxDepth = 0;

    for (const char of query) {
      if (char === '{') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === '}') {
        depth--;
      }
    }

    return maxDepth;
  }

  /**
   * Main build process
   */
  build() {
    console.log('🚀 Building GraphQL query allowlist...');
    console.log(`📂 Client directory: ${CLIENT_DIR}`);
    console.log(`📝 Output file: ${OUTPUT_FILE}`);

    this.extractQueries();
    this.generateHashes();
    const issues = this.validate();
    this.writeAllowlist();

    console.log('\n📊 Summary:');
    console.log(`   Queries found: ${this.queries.size}`);
    console.log(`   Hashes generated: ${this.hashes.size}`);
    console.log(`   Validation issues: ${issues.length}`);

    if (issues.length > 0) {
      console.log(
        '\n⚠️  Please review validation issues before deploying to production',
      );
      process.exit(1);
    }

    console.log('\n✅ Allowlist build complete!');
  }
}

// CLI entry point
if (require.main === module) {
  const builder = new QueryAllowlistBuilder();
  builder.build();
}

module.exports = QueryAllowlistBuilder;
