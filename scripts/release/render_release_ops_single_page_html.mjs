#!/usr/bin/env node
/**
 * render_release_ops_single_page_html.mjs v1.1.0
 *
 * Converts release_ops_single_page.md to a standalone HTML file
 * for improved readability in browsers.
 *
 * Uses the `marked` library (already in repo) for markdown parsing.
 * Produces deterministic output with no remote assets or JS.
 * Includes styling for redaction health badges (OK/WARN/FAIL).
 *
 * Authority: docs/ci/RELEASE_OPS_SINGLE_PAGE.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, basename } from 'path';
import { fileURLToPath } from 'url';

// Dynamically import marked (handle different installation locations)
let marked;
try {
  // Try importing from the closest available location
  const markedModule = await import('marked');
  marked = markedModule.marked || markedModule.default;
} catch (e) {
  console.error('[ERROR] Could not load marked library:', e.message);
  console.error('[ERROR] Ensure marked is installed: pnpm add -w marked');
  process.exit(1);
}

// --- Configuration ---
const SCRIPT_VERSION = '1.1.0';

// --- HTML Template ---
const HTML_TEMPLATE = (title, content, tocHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    /* Reset and base */
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #24292f;
      background: #fff;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px 40px;
    }

    /* Typography */
    h1 {
      font-size: 2em;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 0.3em;
      margin-top: 0;
    }
    h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 0.3em;
      margin-top: 1.5em;
    }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    h4 { font-size: 1em; margin-top: 1em; }

    /* Links */
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Code */
    code {
      background: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 85%;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      line-height: 1.45;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: 100%;
    }

    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #d0d7de;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f6f8fa; }

    /* Blockquotes */
    blockquote {
      margin: 0;
      padding: 0 1em;
      color: #57606a;
      border-left: 4px solid #d0d7de;
    }

    /* Lists */
    ul, ol { padding-left: 2em; }
    li { margin: 0.25em 0; }

    /* Horizontal rules */
    hr {
      border: 0;
      height: 1px;
      background: #d0d7de;
      margin: 1.5em 0;
    }

    /* Details/Summary (collapsibles) */
    details {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      margin: 1em 0;
      padding: 0;
    }
    details summary {
      padding: 12px 16px;
      cursor: pointer;
      font-weight: 600;
      background: #f6f8fa;
      border-radius: 6px;
    }
    details summary:hover { background: #eaeef2; }
    details[open] summary {
      border-bottom: 1px solid #d0d7de;
      border-radius: 6px 6px 0 0;
    }
    details > *:not(summary) {
      padding: 0 16px;
    }
    details > pre {
      margin: 16px;
      padding: 16px;
    }

    /* Status indicators */
    .status-promotable { color: #1a7f37; }
    .status-blocked { color: #cf222e; }
    .status-pending { color: #9a6700; }

    /* Redaction health badges */
    .health-ok, .health-warn, .health-fail, .health-unknown {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 0.9em;
    }
    .health-ok {
      background: #dafbe1;
      color: #1a7f37;
      border: 1px solid #1a7f37;
    }
    .health-warn {
      background: #fff8c5;
      color: #9a6700;
      border: 1px solid #d4a72c;
    }
    .health-fail {
      background: #ffebe9;
      color: #cf222e;
      border: 1px solid #cf222e;
    }
    .health-unknown {
      background: #f6f8fa;
      color: #57606a;
      border: 1px solid #d0d7de;
    }

    /* Table of contents */
    .toc {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 1em 0 2em 0;
    }
    .toc h4 {
      margin: 0 0 0.5em 0;
      font-size: 0.9em;
      text-transform: uppercase;
      color: #57606a;
    }
    .toc ul {
      margin: 0;
      padding-left: 1.5em;
    }
    .toc li { margin: 0.3em 0; }

    /* Emphasis for warnings/missing */
    em {
      color: #57606a;
    }

    /* Print styles */
    @media print {
      body { max-width: none; padding: 0; }
      details { break-inside: avoid; }
      details[open] { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${tocHtml}
${content}
<footer style="margin-top: 3em; padding-top: 1em; border-top: 1px solid #d0d7de; color: #57606a; font-size: 0.875em;">
  Generated by <code>render_release_ops_single_page_html.mjs</code> v${SCRIPT_VERSION}
</footer>
</body>
</html>`;

// --- Utilities ---

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function extractHeadings(markdown) {
  const headings = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = slugify(text);
      headings.push({ level, text, slug });
    }
  }

  return headings;
}

function generateToc(headings) {
  if (headings.length === 0) return '';

  let html = '<nav class="toc">\n<h4>Contents</h4>\n<ul>\n';

  for (const h of headings) {
    const indent = h.level === 3 ? '  ' : '';
    html += `${indent}<li><a href="#${h.slug}">${escapeHtml(h.text)}</a></li>\n`;
  }

  html += '</ul>\n</nav>\n';
  return html;
}

function addHeadingIds(html, headings) {
  // Add id attributes to h2 and h3 elements
  for (const h of headings) {
    const tagLevel = h.level;
    const escapedText = escapeHtml(h.text);

    // Match the heading and add id
    const regex = new RegExp(`<h${tagLevel}>([^<]*${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)</h${tagLevel}>`, 'i');
    html = html.replace(regex, `<h${tagLevel} id="${h.slug}">$1</h${tagLevel}>`);
  }

  return html;
}

function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    title: 'Release Ops Single Page',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--in':
      case '-i':
        options.input = args[++i];
        break;
      case '--out':
      case '-o':
        options.output = args[++i];
        break;
      case '--title':
      case '-t':
        options.title = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        if (arg.startsWith('-')) {
          console.error(`[ERROR] Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function printUsage() {
  console.log(`
render_release_ops_single_page_html.mjs v${SCRIPT_VERSION}

Converts release_ops_single_page.md to standalone HTML.

USAGE:
  node render_release_ops_single_page_html.mjs [OPTIONS]

OPTIONS:
  --in, -i FILE     Input markdown file (required)
  --out, -o FILE    Output HTML file (required)
  --title, -t TEXT  HTML page title (default: "Release Ops Single Page")
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

EXAMPLES:
  node scripts/release/render_release_ops_single_page_html.mjs \\
    --in artifacts/release-train/release_ops_single_page.md \\
    --out artifacts/release-train/release_ops_single_page.html

  node scripts/release/render_release_ops_single_page_html.mjs \\
    -i summary.md -o summary.html --title "My Repo - Release Ops"
`);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Validate required options
  if (!options.input) {
    console.error('[ERROR] Missing required option: --in');
    process.exit(1);
  }
  if (!options.output) {
    console.error('[ERROR] Missing required option: --out');
    process.exit(1);
  }

  // Check input file exists
  if (!existsSync(options.input)) {
    console.error(`[ERROR] Input file not found: ${options.input}`);
    process.exit(1);
  }

  options.verbose && console.log(`[INFO] Reading: ${options.input}`);

  // Read markdown
  const markdown = readFileSync(options.input, 'utf-8');

  // Extract headings for TOC
  const headings = extractHeadings(markdown);
  options.verbose && console.log(`[INFO] Found ${headings.length} headings`);

  // Generate TOC
  const tocHtml = generateToc(headings);

  // Configure marked
  marked.setOptions({
    gfm: true,           // GitHub Flavored Markdown
    breaks: false,       // Don't convert \n to <br>
    pedantic: false,
    headerIds: false,    // We add our own IDs
    mangle: false        // Don't escape HTML entities in headings
  });

  // Convert markdown to HTML
  options.verbose && console.log('[INFO] Converting markdown to HTML');
  let contentHtml = marked(markdown);

  // Add heading IDs for TOC links
  contentHtml = addHeadingIds(contentHtml, headings);

  // Generate final HTML
  const html = HTML_TEMPLATE(options.title, contentHtml, tocHtml);

  // Write output
  options.verbose && console.log(`[INFO] Writing: ${options.output}`);
  writeFileSync(options.output, html, 'utf-8');

  console.log(`[INFO] Generated: ${options.output}`);
  console.log(`[INFO] Size: ${(html.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('[ERROR] Render failed:', err.message);
  process.exit(1);
});
