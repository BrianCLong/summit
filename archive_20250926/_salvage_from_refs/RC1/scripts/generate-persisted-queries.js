#!/usr/bin/env node

/**
 * Generate Persisted Queries for IntelGraph
 * 
 * This script analyzes GraphQL operations from:
 * - Frontend query files (*.graphql, *.gql)
 * - React components with gql templates
 * - Test files with GraphQL operations
 * 
 * Usage:
 * - npm run build:persisted-queries
 * - node scripts/generate-persisted-queries.js
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');

class PersistedQueryGenerator {
  constructor(options = {}) {
    this.options = {
      clientDir: options.clientDir || path.join(process.cwd(), 'client'),
      outputFile: options.outputFile || path.join(process.cwd(), 'persisted-queries.json'),
      includePatterns: options.includePatterns || [
        'client/**/*.{js,jsx,ts,tsx}',
        'client/**/*.{graphql,gql}',
        'server/**/*.test.{js,ts}',
        'tests/**/*.{js,ts}'
      ],
      excludePatterns: options.excludePatterns || [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ],
      ...options
    };

    this.queries = new Map();
  }

  /**
   * Generate hash for a query
   */
  generateHash(query) {
    return crypto.createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Calculate query complexity
   */
  calculateComplexity(query) {
    const fieldCount = (query.match(/\w+\s*\{/g) || []).length;
    const depthCount = (query.match(/\{/g) || []).length;
    const fragmentCount = (query.match(/\.\.\./g) || []).length;
    
    return fieldCount + (depthCount * 2) + (fragmentCount * 3);
  }

  /**
   * Extract GraphQL operations from file content
   */
  extractOperations(content, filePath) {
    const operations = [];

    // Match gql`` template literals
    const gqlTemplateRegex = /gql`([^`]+)`/gs;
    let match;

    while ((match = gqlTemplateRegex.exec(content)) !== null) {
      const query = match[1].trim();
      if (query) {
        operations.push({
          query,
          source: filePath,
          type: 'template-literal'
        });
      }
    }

    // Match .graphql/.gql file content
    if (filePath.endsWith('.graphql') || filePath.endsWith('.gql')) {
      const query = content.trim();
      if (query) {
        operations.push({
          query,
          source: filePath,
          type: 'graphql-file'
        });
      }
    }

    // Match GraphQL strings in test files
    const testQueryRegex = /(?:query|mutation|subscription)\s*[^"']*["']([^"']+)["']/gs;
    while ((match = testQueryRegex.exec(content)) !== null) {
      const query = match[1].trim();
      if (query && query.includes('{')) {
        operations.push({
          query,
          source: filePath,
          type: 'test-string'
        });
      }
    }

    return operations;
  }

  /**
   * Parse operation name from GraphQL query
   */
  parseOperationName(query) {
    const operationMatch = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
    return operationMatch ? operationMatch[1] : null;
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const operations = this.extractOperations(content, filePath);

      for (const operation of operations) {
        const hash = this.generateHash(operation.query);
        const operationName = this.parseOperationName(operation.query);
        const complexity = this.calculateComplexity(operation.query);

        if (!this.queries.has(hash)) {
          this.queries.set(hash, {
            hash,
            query: operation.query.trim(),
            operationName,
            complexity,
            sources: [],
            firstSeen: new Date().toISOString(),
            source: 'build-time'
          });
        }

        // Add source file to list
        const query = this.queries.get(hash);
        if (!query.sources.includes(operation.source)) {
          query.sources.push(operation.source);
        }
      }

    } catch (error) {
      console.warn(`Failed to process ${filePath}:`, error.message);
    }
  }

  /**
   * Find all relevant files
   */
  async findFiles() {
    const allFiles = [];

    for (const pattern of this.options.includePatterns) {
      const files = glob.sync(pattern, {
        ignore: this.options.excludePatterns,
        absolute: true
      });
      allFiles.push(...files);
    }

    // Remove duplicates
    return [...new Set(allFiles)];
  }

  /**
   * Add common server-side queries
   */
  addServerQueries() {
    const serverQueries = [
      {
        name: 'GetUser',
        query: `
          query GetUser($id: ID!) {
            user(id: $id) {
              id
              email
              role
              tenantId
              createdAt
            }
          }
        `
      },
      {
        name: 'Health',
        query: `
          query Health {
            __typename
          }
        `
      },
      {
        name: 'GetGraphStats',
        query: `
          query GetGraphStats($investigationId: ID!) {
            investigation(id: $investigationId) {
              id
              entityCount
              relationshipCount
              lastActivity
            }
          }
        `
      }
    ];

    for (const { name, query } of serverQueries) {
      const hash = this.generateHash(query);
      const complexity = this.calculateComplexity(query);

      this.queries.set(hash, {
        hash,
        query: query.trim(),
        operationName: name,
        complexity,
        sources: ['server-common'],
        firstSeen: new Date().toISOString(),
        source: 'server'
      });
    }
  }

  /**
   * Generate the persisted queries file
   */
  async generate() {
    console.log('🔍 Finding GraphQL operations...');
    
    const files = await this.findFiles();
    console.log(`Found ${files.length} files to process`);

    // Process all files
    await Promise.all(files.map(file => this.processFile(file)));

    // Add server-side queries
    this.addServerQueries();

    // Convert to output format
    const output = {};
    for (const [hash, queryData] of this.queries.entries()) {
      output[hash] = {
        ...queryData,
        // Remove sources array from output (keep for logging)
        sources: undefined
      };
      delete output[hash].sources;
    }

    // Write to file
    await fs.writeFile(
      this.options.outputFile,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    // Generate summary
    const stats = this.generateStats();
    console.log('\n✅ Persisted queries generated successfully!');
    console.log(`📄 Output: ${this.options.outputFile}`);
    console.log(`📊 Total queries: ${stats.total}`);
    console.log(`🔧 Average complexity: ${stats.averageComplexity.toFixed(1)}`);
    console.log(`📂 Source breakdown:`);
    for (const [source, count] of Object.entries(stats.bySource)) {
      console.log(`   ${source}: ${count}`);
    }

    if (stats.duplicateQueries.length > 0) {
      console.log(`\n⚠️  Found ${stats.duplicateQueries.length} duplicate queries:`);
      stats.duplicateQueries.forEach(dup => {
        console.log(`   ${dup.operationName || 'unnamed'} (${dup.sources.length} sources)`);
      });
    }

    return output;
  }

  /**
   * Generate statistics
   */
  generateStats() {
    const queries = Array.from(this.queries.values());
    
    return {
      total: queries.length,
      bySource: queries.reduce((acc, q) => {
        acc[q.source] = (acc[q.source] || 0) + 1;
        return acc;
      }, {}),
      averageComplexity: queries.reduce((sum, q) => sum + q.complexity, 0) / queries.length,
      duplicateQueries: queries.filter(q => q.sources && q.sources.length > 1),
      highComplexity: queries.filter(q => q.complexity > 100)
    };
  }

  /**
   * Validate generated queries
   */
  async validate() {
    console.log('\n🔍 Validating generated queries...');
    
    const queries = Array.from(this.queries.values());
    const issues = [];

    for (const query of queries) {
      // Check for basic GraphQL syntax
      if (!query.query.match(/^(query|mutation|subscription)/)) {
        issues.push(`Invalid operation type: ${query.operationName || query.hash}`);
      }

      // Check for balanced braces
      const openBraces = (query.query.match(/\{/g) || []).length;
      const closeBraces = (query.query.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unbalanced braces: ${query.operationName || query.hash}`);
      }

      // Check for extremely high complexity
      if (query.complexity > 500) {
        issues.push(`High complexity (${query.complexity}): ${query.operationName || query.hash}`);
      }
    }

    if (issues.length > 0) {
      console.log('❌ Validation issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
      return false;
    }

    console.log('✅ All queries validated successfully');
    return true;
  }
}

// CLI interface
async function main() {
  const generator = new PersistedQueryGenerator();
  
  try {
    await generator.generate();
    const isValid = await generator.validate();
    
    if (!isValid) {
      process.exit(1);
    }

    console.log('\n🎉 Persisted queries generation complete!');
    
  } catch (error) {
    console.error('❌ Failed to generate persisted queries:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PersistedQueryGenerator;