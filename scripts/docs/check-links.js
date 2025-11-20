#!/usr/bin/env node
/**
 * Documentation Link Checker
 *
 * Validates all internal links in markdown documentation files.
 * Ensures no broken references exist.
 *
 * Usage:
 *   node scripts/docs/check-links.js
 *   node scripts/docs/check-links.js --fix  # Auto-fix relative paths
 *
 * Exit codes:
 *   0 - All links valid
 *   1 - Broken links found
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const DOCS_DIR = path.join(__dirname, '../../docs');
const DOCS_SITE_DIR = path.join(__dirname, '../../docs-site');

// Track results
const results = {
  totalFiles: 0,
  totalLinks: 0,
  brokenLinks: [],
  externalLinks: [],
};

/**
 * Extract all markdown links from content
 */
function extractLinks(content, filePath) {
  const links = [];

  // Match [text](url) and [text](url "title")
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkUrl = match[2].split(' ')[0].replace(/["']/g, ''); // Remove quotes and title

    links.push({
      text: linkText,
      url: linkUrl,
      line: content.substring(0, match.index).split('\n').length,
      filePath,
    });
  }

  return links;
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve a relative link from a source file
 */
function resolveLinkPath(sourceFile, linkUrl) {
  // Skip external links
  if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
    return { type: 'external', url: linkUrl };
  }

  // Skip anchors and fragments
  if (linkUrl.startsWith('#')) {
    return { type: 'anchor', url: linkUrl };
  }

  // Remove anchor from URL
  const urlWithoutAnchor = linkUrl.split('#')[0];
  if (!urlWithoutAnchor) {
    return { type: 'anchor', url: linkUrl };
  }

  // Resolve relative path
  const sourceDir = path.dirname(sourceFile);
  const resolvedPath = path.resolve(sourceDir, urlWithoutAnchor);

  return { type: 'internal', path: resolvedPath };
}

/**
 * Validate all links in a markdown file
 */
function validateLinks(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const links = extractLinks(content, filePath);

  results.totalLinks += links.length;

  for (const link of links) {
    const resolved = resolveLinkPath(filePath, link.url);

    if (resolved.type === 'external') {
      results.externalLinks.push(link);
    } else if (resolved.type === 'internal') {
      if (!fileExists(resolved.path)) {
        results.brokenLinks.push({
          ...link,
          resolvedPath: resolved.path,
        });
      }
    }
    // Anchors are always valid (we don't validate anchor existence)
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Checking documentation links...\n');

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
    validateLinks(file);
  }

  // Report results
  console.log('📊 Results:');
  console.log(`   Total files: ${results.totalFiles}`);
  console.log(`   Total links: ${results.totalLinks}`);
  console.log(`   External links: ${results.externalLinks.length}`);
  console.log(`   Broken links: ${results.brokenLinks.length}\n`);

  if (results.brokenLinks.length > 0) {
    console.error('❌ Broken links found:\n');

    for (const link of results.brokenLinks) {
      const relativePath = path.relative(process.cwd(), link.filePath);
      console.error(`  ${relativePath}:${link.line}`);
      console.error(`    Text: "${link.text}"`);
      console.error(`    Link: ${link.url}`);
      console.error(`    Resolved to: ${link.resolvedPath}`);
      console.error(`    ❌ File does not exist\n`);
    }

    process.exit(1);
  }

  console.log('✅ All internal links are valid!');

  if (results.externalLinks.length > 0) {
    console.log('\n📝 Note: External links are not validated automatically.');
    console.log('   Consider using a service like linkchecker for external validation.');
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

module.exports = { extractLinks, resolveLinkPath, fileExists };
