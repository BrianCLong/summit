#!/usr/bin/env node
/**
 * Documentation Code Snippet Validator
 *
 * Validates that code snippets in documentation reference real files/commands.
 * Ensures examples stay in sync with actual codebase.
 *
 * Usage:
 *   node scripts/docs/validate-snippets.js
 *   node scripts/docs/validate-snippets.js --strict  # Fail on warnings
 *
 * Exit codes:
 *   0 - All snippets valid
 *   1 - Invalid snippets found
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { execSync } = require('child_process');

const DOCS_DIR = path.join(__dirname, '../../docs');
const PROJECT_ROOT = path.join(__dirname, '../..');

const results = {
  totalFiles: 0,
  totalSnippets: 0,
  invalidSnippets: [],
  warnings: [],
};

/**
 * Extract code blocks from markdown content
 */
function extractCodeBlocks(content, filePath) {
  const blocks = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];
    const line = content.substring(0, match.index).split('\n').length;

    blocks.push({
      language,
      code,
      line,
      filePath,
    });
  }

  return blocks;
}

/**
 * Validate bash/shell commands
 */
function validateBashSnippet(snippet) {
  const lines = snippet.code.split('\n').filter(line => {
    // Filter out comments and empty lines
    return line.trim() && !line.trim().startsWith('#');
  });

  const issues = [];

  for (const line of lines) {
    // Check for file references
    const fileRefRegex = /(?:cat|head|tail|less|more|vim|nano|code)\s+([^\s]+)/;
    const fileMatch = line.match(fileRefRegex);

    if (fileMatch) {
      const filePath = fileMatch[1];
      if (!filePath.startsWith('$') && !filePath.includes('*')) {
        const fullPath = path.join(PROJECT_ROOT, filePath);
        if (!fs.existsSync(fullPath)) {
          issues.push({
            type: 'missing_file',
            line: snippet.line,
            command: line,
            file: filePath,
            message: `Referenced file does not exist: ${filePath}`,
          });
        }
      }
    }

    // Check for npm/pnpm scripts
    const npmScriptRegex = /(?:npm|pnpm|yarn)\s+run\s+([^\s]+)/;
    const npmMatch = line.match(npmScriptRegex);

    if (npmMatch) {
      const scriptName = npmMatch[1];
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.scripts && !packageJson.scripts[scriptName]) {
          results.warnings.push({
            file: snippet.filePath,
            line: snippet.line,
            message: `npm script "${scriptName}" not found in package.json`,
            snippet: line,
          });
        }
      }
    }

    // Check for CLI commands that should exist
    const cliCommands = ['maestro', 'maestro-init', 'maestro-explain', 'maestro-query', 'maestro-doctor'];
    for (const cmd of cliCommands) {
      if (line.includes(cmd) && !line.includes('install') && !line.includes('npm')) {
        // Verify command exists or is documented
        results.warnings.push({
          file: snippet.filePath,
          line: snippet.line,
          message: `CLI command "${cmd}" referenced - ensure it's installed or documented`,
          snippet: line,
          severity: 'info',
        });
      }
    }
  }

  return issues;
}

/**
 * Validate TypeScript/JavaScript snippets
 */
function validateJSSnippet(snippet) {
  const issues = [];

  // Check for import statements referencing local files
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(snippet.code)) !== null) {
    const importPath = match[1];

    // Skip node_modules and external packages
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      const possiblePaths = [
        path.join(PROJECT_ROOT, importPath),
        path.join(PROJECT_ROOT, importPath + '.ts'),
        path.join(PROJECT_ROOT, importPath + '.js'),
        path.join(PROJECT_ROOT, importPath, 'index.ts'),
        path.join(PROJECT_ROOT, importPath, 'index.js'),
      ];

      const exists = possiblePaths.some(p => fs.existsSync(p));

      if (!exists) {
        results.warnings.push({
          file: snippet.filePath,
          line: snippet.line,
          message: `Import path may not exist: ${importPath}`,
          snippet: match[0],
        });
      }
    }
  }

  return issues;
}

/**
 * Validate a code snippet
 */
function validateSnippet(snippet) {
  const validators = {
    bash: validateBashSnippet,
    sh: validateBashSnippet,
    shell: validateBashSnippet,
    typescript: validateJSSnippet,
    ts: validateJSSnippet,
    javascript: validateJSSnippet,
    js: validateJSSnippet,
  };

  const validator = validators[snippet.language.toLowerCase()];
  if (validator) {
    return validator(snippet);
  }

  return []; // No validation for other languages
}

/**
 * Validate all snippets in a markdown file
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const snippets = extractCodeBlocks(content, filePath);

  results.totalSnippets += snippets.length;

  for (const snippet of snippets) {
    const issues = validateSnippet(snippet);
    if (issues.length > 0) {
      results.invalidSnippets.push(...issues);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Validating documentation code snippets...\n');

  const isStrict = process.argv.includes('--strict');

  // Find all markdown files
  const markdownFiles = await glob('**/*.md', {
    cwd: DOCS_DIR,
    absolute: true,
    ignore: ['**/node_modules/**', '**/archive/**'],
  });

  results.totalFiles = markdownFiles.length;
  console.log(`Found ${results.totalFiles} markdown files\n`);

  // Validate each file
  for (const file of markdownFiles) {
    validateFile(file);
  }

  // Report results
  console.log('📊 Results:');
  console.log(`   Total files: ${results.totalFiles}`);
  console.log(`   Total code snippets: ${results.totalSnippets}`);
  console.log(`   Invalid snippets: ${results.invalidSnippets.length}`);
  console.log(`   Warnings: ${results.warnings.length}\n`);

  // Report invalid snippets
  if (results.invalidSnippets.length > 0) {
    console.error('❌ Invalid code snippets found:\n');

    for (const issue of results.invalidSnippets) {
      const relativePath = path.relative(process.cwd(), issue.filePath || issue.file);
      console.error(`  ${relativePath}:${issue.line}`);
      console.error(`    ${issue.message}`);
      if (issue.command) {
        console.error(`    Command: ${issue.command}`);
      }
      console.error('');
    }
  }

  // Report warnings
  if (results.warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');

    for (const warning of results.warnings) {
      const relativePath = path.relative(process.cwd(), warning.file);
      const severity = warning.severity || 'warning';
      const icon = severity === 'info' ? 'ℹ️' : '⚠️';

      console.warn(`  ${icon} ${relativePath}:${warning.line}`);
      console.warn(`    ${warning.message}`);
      if (warning.snippet) {
        console.warn(`    Snippet: ${warning.snippet}`);
      }
      console.warn('');
    }
  }

  // Determine exit code
  if (results.invalidSnippets.length > 0) {
    console.error('❌ Validation failed: Invalid code snippets found');
    process.exit(1);
  }

  if (isStrict && results.warnings.length > 0) {
    console.error('❌ Validation failed: Warnings found (strict mode)');
    process.exit(1);
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  Validation passed with warnings');
  } else {
    console.log('✅ All code snippets are valid!');
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { extractCodeBlocks, validateSnippet };
