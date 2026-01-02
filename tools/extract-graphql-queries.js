// tools/extract-graphql-queries.js
import fs from 'fs/promises';
import path from 'path';
import { parse, visit } from 'graphql';
import crypto from 'crypto';

/**
 * Extractor for GraphQL queries from source code
 */
export class QueryExtractor {
  constructor() {
    this.queries = new Map(); // Map<hash, query>
    this.filesProcessed = []; // Track which files were processed
  }

  /**
   * Extract all GraphQL queries from a directory
   */
  async extractFromDirectory(dirPath, extensions = ['.tsx', '.jsx', '.ts', '.js']) {
    console.log(`🔍 Scanning directory: ${dirPath}`);
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and hidden directories
          if (item.name === 'node_modules' || item.name.startsWith('.')) {
            continue;
          }
          
          await this.extractFromDirectory(fullPath, extensions);
        } else if (extensions.some(ext => fullPath.endsWith(ext))) {
          await this.extractFromFiles([fullPath]);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Extract GraphQL queries from an array of specific files
   */
  async extractFromFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await this.extractFromFile(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Extract GraphQL queries from a single file
   */
  async extractFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const foundQueries = this.extractQueriesFromFileContent(content, filePath);
      
      // Log results
      if (foundQueries.length > 0) {
        console.log(`  📄 Found ${foundQueries.length} queries in ${filePath}`);
        this.filesProcessed.push(filePath);
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  /**
   * Extract queries from file content using multiple strategies
   */
  extractQueriesFromFileContent(content, filePath) {
    const queries = [];
    
    // Strategy 1: Extract from gql template literals
    const gqlRegex = /gql\s*`([\s\S]*?)`/g;
    let match;
    
    while ((match = gqlRegex.exec(content)) !== null) {
      const query = this.cleanQuery(match[1]);
      if (this.isValidGraphQL(query)) {
        const hash = this.generateQueryHash(query);
        this.queries.set(hash, {
          query,
          hash,
          file: filePath,
          type: 'template_literal',
          operation: this.getOperationType(query)
        });
        queries.push(query);
      }
    }
    
    // Strategy 2: Extract from graphql function calls
    const graphqlFuncRegex = /graphql\s*\(\s*`([\s\S]*?)`\s*\)/g;
    while ((match = graphqlFuncRegex.exec(content)) !== null) {
      const query = this.cleanQuery(match[1]);
      if (this.isValidGraphQL(query)) {
        const hash = this.generateQueryHash(query);
        this.queries.set(hash, {
          query,
          hash,
          file: filePath,
          type: 'graphql_func',
          operation: this.getOperationType(query)
        });
        queries.push(query);
      }
    }
    
    // Strategy 3: Extract from string variables that look like GraphQL
    const stringVarRegex = /(const|let|var)\s+\w+\s*=\s*`([\s\S]*?)`;/g;
    while ((match = stringVarRegex.exec(content)) !== null) {
      const query = this.cleanQuery(match[2]);
      if (this.isValidGraphQL(query) && this.isLikelyGraphQL(query)) {
        const hash = this.generateQueryHash(query);
        this.queries.set(hash, {
          query,
          hash,
          file: filePath,
          type: 'string_variable',
          operation: this.getOperationType(query)
        });
        queries.push(query);
      }
    }
    
    return queries;
  }

  /**
   * Clean and normalize GraphQL query
   */
  cleanQuery(query) {
    // Remove common JavaScript interpolation strings that might break parsing
    let cleaned = query
      // Remove template literal placeholders
      .replace(/\$\{[^}]+\}/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Trim
      .trim();
      
    return cleaned;
  }

  /**
   * Check if the content looks like a valid GraphQL query
   */
  isValidGraphQL(query) {
    try {
      parse(query);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Additional check to determine if a string is likely GraphQL
   */
  isLikelyGraphQL(query) {
    // Check for common GraphQL keywords
    const keywords = ['query', 'mutation', 'subscription', '{', '}', '(', ')', ':', '!', '...'];
    return keywords.some(keyword => query.includes(keyword));
  }

  /**
   * Get the type of operation (query, mutation, subscription)
   */
  getOperationType(query) {
    if (query.toLowerCase().includes('query ')) return 'query';
    if (query.toLowerCase().includes('mutation ')) return 'mutation';
    if (query.toLowerCase().includes('subscription ')) return 'subscription';
    return 'unknown';
  }

  /**
   * Generate SHA-256 hash for query
   */
  generateQueryHash(query) {
    return crypto
      .createHash('sha256')
      .update(query)
      .digest('hex');
  }

  /**
   * Export queries to allowlist format
   */
  exportAllowlist(outputPath, metadata = {}) {
    const allowlist = Array.from(this.queries.entries()).map(([hash, queryInfo]) => ({
      hash,
      query: queryInfo.query,
      operation: queryInfo.operation,
      file: queryInfo.file,
      type: queryInfo.type,
      addedAt: new Date().toISOString(),
      ...metadata
    }));

    const output = JSON.stringify(allowlist, null, 2);
    fs.writeFileSync(outputPath, output);
    
    console.log(`✅ Exported ${allowlist.length} queries to ${outputPath}`);
    return allowlist;
  }

  /**
   * Export queries for different purposes
   */
  exportForEnvironment(outputPath, environment = 'production') {
    return this.exportAllowlist(outputPath, { environment });
  }

  /**
   * Get all extracted queries
   */
  getQueries() {
    return this.queries;
  }

  /**
   * Get statistics about extracted queries
   */
  getStats() {
    const stats = {
      totalQueries: this.queries.size,
      byType: {},
      byOperation: {},
      byFile: {},
      filesProcessed: this.filesProcessed.length
    };

    for (const [, queryInfo] of this.queries) {
      // Count by type
      stats.byType[queryInfo.type] = (stats.byType[queryInfo.type] || 0) + 1;
      
      // Count by operation
      stats.byOperation[queryInfo.operation] = (stats.byOperation[queryInfo.operation] || 0) + 1;
      
      // Count by file
      stats.byFile[queryInfo.file] = (stats.byFile[queryInfo.file] || 0) + 1;
    }

    return stats;
  }

  /**
   * Filter queries based on custom criteria
   */
  filter(criteriaFn) {
    const filtered = new Map();
    for (const [hash, queryInfo] of this.queries) {
      if (criteriaFn(queryInfo)) {
        filtered.set(hash, queryInfo);
      }
    }
    return filtered;
  }

  /**
   * Merge with another query extractor's results
   */
  merge(otherExtractor) {
    for (const [hash, queryInfo] of otherExtractor.getQueries()) {
      this.queries.set(hash, queryInfo);
    }
  }
  
  /**
   * Get unique queries by operation type
   */
  getQueriesByOperation(operationType) {
    return this.filter(queryInfo => queryInfo.operation === operationType);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: node extract-graphql-queries.js <input-directory> <output-file> [options]

Examples:
  node extract-graphql-queries.js ./client/src ./query-allowlist.json
  node extract-graphql-queries.js ./src ./allowlist.json --env production

Options:
  --env <environment>    Specify environment (default: production)
  --include <patterns>   Include specific file patterns
  --exclude <patterns>   Exclude specific file patterns
    `);
    process.exit(1);
  }

  const [inputDir, outputFile] = args;
  const envFlagIndex = args.indexOf('--env');
  const environment = envFlagIndex !== -1 ? args[envFlagIndex + 1] || 'production' : 'production';

  console.log('🚀 Starting GraphQL query extraction...');
  console.log(`📋 Input directory: ${inputDir}`);
  console.log(`📥 Output file: ${outputFile}`);
  console.log(`🌍 Environment: ${environment}`);
  console.log('');

  const extractor = new QueryExtractor();
  
  extractor.extractFromDirectory(inputDir)
    .then(() => {
      extractor.exportForEnvironment(outputFile, environment);
      
      const stats = extractor.getStats();
      console.log('');
      console.log('📊 Extraction Statistics:');
      console.log(`   Total queries found: ${stats.totalQueries}`);
      console.log(`   Files processed: ${stats.filesProcessed}`);
      console.log(`   Operation types:`, stats.byOperation);
      console.log(`   Query types:`, stats.byType);
      
      console.log('✅ Query extraction completed successfully!');
    })
    .catch(error => {
      console.error('❌ Query extraction failed:', error);
      process.exit(1);
    });
}