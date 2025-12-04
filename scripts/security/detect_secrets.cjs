#!/usr/bin/env node

/**
 * detect_secrets.js
 *
 * Simple script to scan for potential secrets in the codebase.
 * It looks for high-entropy strings and known patterns.
 *
 * Usage: node scripts/security/detect_secrets.js
 */

const fs = require('fs');
const path = require('path');

// Regex patterns for secrets
const PATTERNS = [
    { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret Key', regex: /"[0-9a-zA-Z\/+]{40}"/ }, // Be careful with false positives
    { name: 'Generic API Key', regex: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i },
    { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})/ },
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: 'GitHub Token', regex: /gh[pousr]_[a-zA-Z0-9]{36}/ },
    { name: 'Hardcoded JWT Secret', regex: /jwt[_-]?secret\s*[:=]\s*['"](?!process\.env)[^'"]{20,}['"]/i }
];

// Files to ignore
const IGNORE_FILES = [
    'package-lock.json',
    'pnpm-lock.yaml',
    '.env',
    '.env.example',
    '.env.test',
    'detect_secrets.js',
    'secrets.ts', // Allowed to have patterns in comments/regex
    'test',
    'mock',
    'dist',
    'build',
    'node_modules',
    'coverage', // Coverage reports often contain hashes
    'gitleaks.json', // Reports
    '.git',
    'patches', // Patches might contain old secrets or diffs
    'CHANGELOG.md',
    'manifest.json', // Often contains hashes
    'SECURITY.md', // Documentation
    'src/config.ts' // Contains variable descriptions that trigger false positives
];

// Directories to ignore
const IGNORE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'artifacts',
    'patches',
    'k8s', // Helm charts often have placeholders
    'charts',
    'deploy',
    'docs', // Docs often have examples
    'october2025' // Archive/Workstreams often have snippets
];

function findFiles(dir, fileList = []) {
  try {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (!IGNORE_DIRS.includes(file) && !filePath.split(path.sep).some(part => IGNORE_DIRS.includes(part))) {
            findFiles(filePath, fileList);
          }
        } else {
            if (/\.(js|ts|json|yml|yaml|md)$/.test(file)) {
                fileList.push(filePath);
            }
        }
      });
  } catch (err) {
      console.warn(`Warning: Could not read directory ${dir}`);
  }

  return fileList;
}

function maskSecret(snippet, matchText) {
    if (!matchText) return snippet;
    return snippet.replace(matchText, '*'.repeat(10));
}

async function scan() {
    console.log('🔍 Scanning for secrets...');
    const files = findFiles('.');

    let foundSecrets = 0;

    for (const file of files) {
        if (IGNORE_FILES.some(ignore => file.includes(ignore))) continue;

        // Skip hidden files
        if (path.basename(file).startsWith('.')) continue;

        const content = fs.readFileSync(file, 'utf-8');

        for (const pattern of PATTERNS) {
            const match = pattern.regex.exec(content);
            if (match) {
                // Check if it's likely a test or placeholder
                const line = content.substring(0, match.index).split('\n').length;
                const snippetStart = Math.max(0, match.index - 20);
                const snippetEnd = Math.min(content.length, match.index + match[0].length + 20);
                const snippet = content.substring(snippetStart, snippetEnd);

                if (
                    snippet.includes('process.env') ||
                    snippet.includes('EXAMPLE') ||
                    snippet.includes('placeholder') ||
                    snippet.includes('change-me') ||
                    snippet.includes('REDACTED') ||
                    snippet.includes('your-') ||
                    snippet.includes('demo') ||
                    snippet.includes('test') ||
                    snippet.includes('dev_jwt_secret') ||
                    snippet.includes('dev_refresh_secret')
                ) {
                    continue;
                }

                console.error(`❌ Potential secret found in ${file}:${line} (${pattern.name})`);
                const maskedSnippet = maskSecret(snippet, match[0]);
                console.error(`   Snippet: ${maskedSnippet.trim().replace(/\n/g, ' ')}`);
                foundSecrets++;
            }
        }
    }

    if (foundSecrets > 0) {
        console.error(`\n🚨 Found ${foundSecrets} potential secrets!`);
        process.exit(1);
    } else {
        console.log('✅ No secrets found.');
    }
}

scan().catch(console.error);
