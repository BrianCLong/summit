#!/usr/bin/env node

/**
 * Generate Persisted Query Hashes from GraphQL Operations
 *
 * This script scans the codebase for GraphQL operations and generates
 * SHA256 hashes for the persisted query allowlist.
 *
 * Usage:
 *   node scripts/generate-pq-hashes.js --output=./artifacts/persisted-queries.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { glob } = require('glob');

// Configuration
const config = {
  scan: {
    patterns: [
      'client/src/**/*.{ts,tsx,js,jsx}',
      'server/src/**/*.graphql',
      'client/src/**/*.graphql',
    ],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.*',
      '**/*.spec.*',
    ],
  },
  operations: {
    // RegEx patterns to extract GraphQL operations
    patterns: {
      gql: /gql`\s*(query|mutation|subscription)([^`]+)`/gim,
      graphql: /graphql`\s*(query|mutation|subscription)([^`]+)`/gim,
      string: /(query|mutation|subscription)\s+\w+[^{]*\{[^}]+\}/gim,
    },
  },
  output: {
    format: 'json',
    includeMetadata: true,
    checksumAlgorithm: 'sha256',
  },
};

class PQHashGenerator {
  constructor() {
    this.operations = new Map();
    this.stats = {
      filesScanned: 0,
      operationsFound: 0,
      duplicates: 0,
      errors: 0,
    };
  }

  async scanCodebase() {
    console.log('🔍 Scanning codebase for GraphQL operations...');

    const files = await glob(config.scan.patterns, {
      ignore: config.scan.excludePatterns,
      absolute: true,
    });

    console.log(`📁 Found ${files.length} files to scan`);

    for (const filePath of files) {
      await this.scanFile(filePath);
    }

    console.log(
      `✅ Scan complete: ${this.stats.operationsFound} operations found in ${this.stats.filesScanned} files`,
    );
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.stats.filesScanned++;

      // Extract operations using different patterns
      for (const [patternName, pattern] of Object.entries(
        config.operations.patterns,
      )) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const operation = this.normalizeOperation(match[0]);
          const hash = this.generateHash(operation);

          if (this.operations.has(hash)) {
            this.stats.duplicates++;
            // Update metadata with additional file location
            const existing = this.operations.get(hash);
            if (!existing.files.includes(filePath)) {
              existing.files.push(filePath);
            }
          } else {
            this.operations.set(hash, {
              hash,
              operation,
              query_name: this.extractQueryName(operation),
              operation_type: this.extractOperationType(operation),
              files: [filePath],
              pattern_matched: patternName,
              created_at: new Date().toISOString(),
              risk_level: this.assessRiskLevel(operation),
              estimated_cost: this.estimateCost(operation),
            });
            this.stats.operationsFound++;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to scan file ${filePath}: ${error.message}`);
      this.stats.errors++;
    }
  }

  normalizeOperation(operation) {
    // Normalize whitespace and remove comments
    return operation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/#[^\r\n]*/g, '') // Remove comments
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s*{\s*/g, ' { ') // Normalize braces
      .replace(/\s*}\s*/g, ' } ')
      .replace(/\s*\(\s*/g, '(') // Normalize parentheses
      .replace(/\s*\)\s*/g, ')')
      .replace(/\s*,\s*/g, ', '); // Normalize commas
  }

  generateHash(operation) {
    return crypto.createHash('sha256').update(operation, 'utf8').digest('hex');
  }

  extractQueryName(operation) {
    // Try to extract operation name
    const nameMatch = operation.match(/(query|mutation|subscription)\s+(\w+)/i);
    return nameMatch ? nameMatch[2] : 'anonymous';
  }

  extractOperationType(operation) {
    const typeMatch = operation.match(/^(query|mutation|subscription)/i);
    return typeMatch ? typeMatch[1].toLowerCase() : 'unknown';
  }

  assessRiskLevel(operation) {
    // Assess risk based on operation content
    const riskKeywords = [
      'delete',
      'remove',
      'destroy',
      'purge',
      'drop',
      'truncate',
      'clear',
      'reset',
      'wipe',
      'bulk',
      'mass',
      'admin',
      'superuser',
      'privilege',
    ];

    const lowerOp = operation.toLowerCase();
    const hasRiskKeywords = riskKeywords.some((keyword) =>
      lowerOp.includes(keyword),
    );

    if (operation.match(/mutation/i)) {
      return hasRiskKeywords ? 'high' : 'medium';
    }

    return hasRiskKeywords ? 'medium' : 'low';
  }

  estimateCost(operation) {
    // Rough cost estimation based on complexity
    let cost = 0.001; // Base cost

    // Count field selections
    const fieldCount = (operation.match(/\w+\s*{/g) || []).length;
    cost += fieldCount * 0.0005;

    // Mutations are more expensive
    if (operation.match(/mutation/i)) {
      cost *= 3;
    }

    // Complex operations (nested selections, fragments)
    const complexity = (operation.match(/{[^}]*{/g) || []).length;
    cost += complexity * 0.002;

    return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
  }

  generateOutput(outputPath) {
    console.log('📝 Generating hash file...');

    const hashes = {};
    const metadata = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      source: 'codebase-scan',
      generator_version: '1.0.0',
      scan_config: {
        patterns: config.scan.patterns,
        excludes: config.scan.excludePatterns,
      },
      stats: this.stats,
    };

    // Convert operations to hash format
    for (const [hash, operation] of this.operations) {
      hashes[hash] = {
        query_name: operation.query_name,
        operation_type: operation.operation_type,
        risk_level: operation.risk_level,
        estimated_cost: operation.estimated_cost,
        created_at: operation.created_at,
        files: operation.files.map((f) => path.relative(process.cwd(), f)),
        pattern_matched: operation.pattern_matched,
      };
    }

    const output = {
      hashes,
      metadata,
      checksum: this.generateChecksum({ hashes, metadata }),
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✅ Hash file generated: ${outputPath}`);
    console.log(`   ${Object.keys(hashes).length} unique hashes`);
    console.log(`   ${this.stats.duplicates} duplicates found`);
    console.log(`   Checksum: ${output.checksum}`);

    return output;
  }

  generateChecksum(data) {
    const content = JSON.stringify(data, null, 0); // No formatting for checksum
    return crypto
      .createHash(config.output.checksumAlgorithm)
      .update(content)
      .digest('hex');
  }

  printStats() {
    console.log('\n📊 Generation Statistics:');
    console.log(`  Files scanned: ${this.stats.filesScanned}`);
    console.log(`  Operations found: ${this.stats.operationsFound}`);
    console.log(`  Duplicates: ${this.stats.duplicates}`);
    console.log(`  Errors: ${this.stats.errors}`);

    const riskBreakdown = {};
    for (const operation of this.operations.values()) {
      riskBreakdown[operation.risk_level] =
        (riskBreakdown[operation.risk_level] || 0) + 1;
    }

    console.log('\n🎯 Risk Level Breakdown:');
    for (const [level, count] of Object.entries(riskBreakdown)) {
      console.log(`  ${level}: ${count} operations`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    options[key.replace(/^--/, '')] = value || true;
  });

  const { output = './persisted-queries.json' } = options;

  console.log('🚀 IntelGraph PQ Hash Generator');
  console.log(`   Output: ${output}`);
  console.log('');

  const generator = new PQHashGenerator();

  try {
    await generator.scanCodebase();
    generator.generateOutput(output);
    generator.printStats();

    console.log('\n🎉 Hash generation completed successfully!');
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PQHashGenerator, config };
