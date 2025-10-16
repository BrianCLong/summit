#!/usr/bin/env node

/**
 * Environment Variables Extractor
 * Automatically discovers environment variables used in codebase
 * and generates reference documentation
 */

const fs = require('fs');
const path = require('path');

class EnvironmentVariablesExtractor {
  constructor(options = {}) {
    this.options = {
      roots: [
        'src',
        'apps',
        'services',
        'packages',
        'server',
        'client',
        'scripts',
      ],
      outputPath: 'docs/reference/environment-variables.md',
      excludePaths: ['node_modules', 'dist', 'build', '.git', '.next', '.nuxt'],
      maxFileSize: 2_000_000, // 2MB limit
      ...options,
    };

    // Patterns for different languages/frameworks
    this.patterns = [
      // Node.js/JavaScript
      {
        name: 'node-process-env',
        regex: /process\.env\.([A-Z0-9_]+)/g,
        language: 'JavaScript/Node.js',
      },
      // React/Next.js (client-side)
      {
        name: 'react-env',
        regex: /process\.env\.NEXT_PUBLIC_([A-Z0-9_]+)/g,
        language: 'React/Next.js',
        transform: (match) => `NEXT_PUBLIC_${match[1]}`,
      },
      // Python
      {
        name: 'python-os-getenv',
        regex: /os\.getenv\(['""]([A-Z0-9_]+)['""].*?\)/g,
        language: 'Python',
      },
      // Shell/Bash
      {
        name: 'shell-variable',
        regex: /\$\{([A-Z0-9_]+)(?::[^}]*)?\}/g,
        language: 'Shell/Bash',
      },
      // .env files
      {
        name: 'dotenv',
        regex: /^([A-Z0-9_]+)=/gm,
        language: 'Environment File',
      },
    ];

    this.discovered = new Map();
    this.fileStats = {
      scanned: 0,
      matched: 0,
      errors: 0,
    };
  }

  /**
   * Extract environment variables from codebase
   */
  async extract() {
    console.log('🔍 Extracting environment variables from codebase...');

    // Scan all configured root directories
    for (const root of this.options.roots) {
      if (fs.existsSync(root)) {
        console.log(`  📁 Scanning ${root}/`);
        await this.scanDirectory(root);
      } else {
        console.log(`  ⚠️  Directory not found: ${root}/`);
      }
    }

    // Process discovered variables
    this.processDiscoveredVariables();

    // Generate documentation
    await this.generateDocumentation();

    console.log(`\n✅ Extraction complete!`);
    console.log(`   Files scanned: ${this.fileStats.scanned}`);
    console.log(`   Variables discovered: ${this.discovered.size}`);

    return {
      variables: Array.from(this.discovered.values()),
      stats: this.fileStats,
    };
  }

  /**
   * Recursively scan directory for files
   */
  async scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);

        // Skip excluded paths
        if (
          this.options.excludePaths.some((exclude) =>
            itemPath.includes(exclude),
          )
        ) {
          continue;
        }

        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          await this.scanDirectory(itemPath);
        } else if (this.shouldScanFile(itemPath, stat)) {
          await this.scanFile(itemPath);
        }
      }
    } catch (error) {
      console.warn(
        `  ⚠️  Error scanning directory ${dirPath}: ${error.message}`,
      );
      this.fileStats.errors++;
    }
  }

  /**
   * Check if file should be scanned
   */
  shouldScanFile(filePath, stat) {
    // Skip large files
    if (stat.size > this.options.maxFileSize) {
      return false;
    }

    // Include common file extensions
    const ext = path.extname(filePath).toLowerCase();
    const scanExtensions = [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.sh',
      '.yml',
      '.yaml',
      '.json',
      '.env',
    ];

    return (
      scanExtensions.includes(ext) || path.basename(filePath).startsWith('.env')
    );
  }

  /**
   * Scan individual file for environment variables
   */
  async scanFile(filePath) {
    try {
      this.fileStats.scanned++;
      const content = fs.readFileSync(filePath, 'utf8');
      let hasMatches = false;

      // Apply all patterns to file content
      for (const pattern of this.patterns) {
        const matches = this.findMatches(content, pattern, filePath);
        if (matches.length > 0) {
          hasMatches = true;
          this.recordMatches(matches, filePath, pattern);
        }
      }

      if (hasMatches) {
        this.fileStats.matched++;
      }
    } catch (error) {
      console.warn(`  ⚠️  Error scanning file ${filePath}: ${error.message}`);
      this.fileStats.errors++;
    }
  }

  /**
   * Find matches for a specific pattern
   */
  findMatches(content, pattern, filePath) {
    const matches = [];
    let match;

    // Reset regex lastIndex to ensure we get all matches
    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(content)) !== null) {
      const varName = pattern.transform ? pattern.transform(match) : match[1];
      if (varName && this.isValidEnvironmentVariable(varName)) {
        matches.push({
          name: varName,
          pattern: pattern.name,
          language: pattern.language,
          lineNumber: this.getLineNumber(content, match.index),
        });
      }
    }

    return matches;
  }

  /**
   * Check if variable name is valid
   */
  isValidEnvironmentVariable(name) {
    // Valid environment variable names (uppercase, numbers, underscores)
    return /^[A-Z0-9_]+$/.test(name) && name.length > 1 && name.length < 100;
  }

  /**
   * Get line number for match
   */
  getLineNumber(content, index) {
    return content.slice(0, index).split('\n').length;
  }

  /**
   * Record discovered matches
   */
  recordMatches(matches, filePath, pattern) {
    for (const match of matches) {
      const varName = match.name;

      if (!this.discovered.has(varName)) {
        this.discovered.set(varName, {
          name: varName,
          description: '',
          defaultValue: '',
          required: false,
          type: 'string',
          category: this.categorizeVariable(varName),
          usages: [],
          files: new Set(),
        });
      }

      const variable = this.discovered.get(varName);
      variable.files.add(filePath);
      variable.usages.push({
        file: filePath,
        line: match.lineNumber,
        pattern: pattern.name,
      });
    }
  }

  /**
   * Categorize variable based on name patterns
   */
  categorizeVariable(name) {
    const categories = [
      {
        pattern: /^(API_|ENDPOINT_|URL_|HOST_|PORT_)/,
        category: 'API & Networking',
      },
      {
        pattern: /^(DB_|DATABASE_|MONGO_|POSTGRES_|REDIS_)/,
        category: 'Database',
      },
      {
        pattern: /^(AUTH_|JWT_|OAUTH_|TOKEN_|SECRET_|KEY_)/,
        category: 'Authentication',
      },
      { pattern: /^(AWS_|AZURE_|GCP_|CLOUD_)/, category: 'Cloud Services' },
      { pattern: /^(LOG_|DEBUG_)/, category: 'Logging & Debug' },
      { pattern: /^(NODE_ENV|ENV|ENVIRONMENT)$/, category: 'Environment' },
    ];

    for (const { pattern, category } of categories) {
      if (pattern.test(name)) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Process discovered variables and enhance with additional info
   */
  processDiscoveredVariables() {
    console.log('📊 Processing discovered variables...');

    for (const [name, variable] of this.discovered) {
      // Convert sets to arrays for serialization
      variable.files = Array.from(variable.files);

      // Infer variable properties
      this.inferVariableProperties(variable);
    }
  }

  /**
   * Infer variable properties from usage patterns
   */
  inferVariableProperties(variable) {
    const name = variable.name;

    // Infer if required based on name patterns
    const requiredPatterns = [
      /^(API_KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL|JWT_SECRET)$/,
      /^(NODE_ENV|PORT|HOST)$/,
    ];

    variable.required = requiredPatterns.some((pattern) => pattern.test(name));

    // Generate helpful descriptions
    variable.description = this.generateVariableDescription(variable);

    // Suggest default values where appropriate
    variable.defaultValue = this.suggestDefaultValue(variable);
  }

  /**
   * Generate helpful description for variable
   */
  generateVariableDescription(variable) {
    const name = variable.name;

    // Description templates based on patterns
    const descriptions = [
      { pattern: /^API_KEY/, template: 'API key for authentication' },
      { pattern: /^DATABASE_URL$/, template: 'Database connection URL' },
      { pattern: /^JWT_SECRET$/, template: 'Secret key for JWT token signing' },
      { pattern: /^PORT$/, template: 'Port number for the application server' },
      {
        pattern: /^NODE_ENV$/,
        template: 'Node.js environment (development, production, test)',
      },
    ];

    for (const { pattern, template } of descriptions) {
      if (pattern.test(name)) {
        return template;
      }
    }

    // Generate description based on category and name
    const friendlyName = name.toLowerCase().replace(/_/g, ' ');
    return `Configuration for ${friendlyName}`;
  }

  /**
   * Suggest default values where appropriate
   */
  suggestDefaultValue(variable) {
    const name = variable.name;

    const defaults = {
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'info',
    };

    return defaults[name] || '';
  }

  /**
   * Generate documentation file
   */
  async generateDocumentation() {
    console.log('📝 Generating documentation...');

    // Sort variables by category, then by name
    const sortedVariables = Array.from(this.discovered.values()).sort(
      (a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      },
    );

    const content = this.generateMarkdownContent(sortedVariables);

    // Ensure output directory exists
    const outputDir = path.dirname(this.options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(this.options.outputPath, content);
    console.log(`  ✅ Documentation saved to ${this.options.outputPath}`);
  }

  /**
   * Generate markdown content
   */
  generateMarkdownContent(variables) {
    const now = new Date().toISOString().split('T')[0];

    let content = `---
title: Environment Variables Reference
summary: Comprehensive reference of environment variables used throughout the IntelGraph codebase
version: latest
lastUpdated: ${now}
owner: platform
generated: true
---

# Environment Variables Reference

> **Auto-generated**: This documentation is automatically generated from codebase analysis.

## Overview

This document provides a comprehensive reference of all environment variables discovered in the IntelGraph codebase.

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
`;

    for (const variable of variables) {
      const required = variable.required ? '✅' : '❌';
      const defaultVal = variable.defaultValue || '-';
      const description = variable.description || 'No description available';

      content += `| \`${variable.name}\` | ${variable.type} | ${required} | \`${defaultVal}\` | ${description} |\n`;
    }

    content += `\n## See also\n`;
    content += `- [Configuration Guide](../how-to/configuration.md)\n`;
    content += `- [Development Setup](../getting-started/development-setup.md)\n`;

    return content;
  }
}

// CLI execution
if (require.main === module) {
  const extractor = new EnvironmentVariablesExtractor();

  extractor
    .extract()
    .then((result) => {
      console.log(
        `\n🎉 Successfully extracted ${result.variables.length} environment variables`,
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    });
}

module.exports = EnvironmentVariablesExtractor;
