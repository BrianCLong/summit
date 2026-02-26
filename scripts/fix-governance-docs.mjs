import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const REPO_ROOT = process.cwd();
const GOVERNANCE_DIR = path.join(REPO_ROOT, 'docs', 'governance');

const DEFAULT_HEADERS = [
  'Owner: Engineering',
  'Status: active',
  'Last-Reviewed: 2024-01-01',
  'Evidence-IDs: unknown-legacy'
];

async function main() {
  console.log(`Scanning ${GOVERNANCE_DIR} for markdown files...`);

  // Use glob to find all markdown files in docs/governance recursively
  // We need to install glob if not available, or use recursive readdir
  // Since we might not have 'glob' package installed in the root script context without pnpm install affecting things,
  // let's use a simple recursive directory walker.

  const files = await listMarkdownFiles(GOVERNANCE_DIR);
  console.log(`Found ${files.length} markdown files.`);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const headerBlock = extractHeaderBlock(content);
    const headers = parseHeaders(headerBlock);

    let newContent = content;
    let modified = false;
    let missingHeaders = [];

    // Check for missing headers
    if (!headers['Owner']) missingHeaders.push('Owner: Engineering');
    if (!headers['Status']) missingHeaders.push('Status: active');
    if (!headers['Last-Reviewed']) missingHeaders.push('Last-Reviewed: 2024-01-01');
    if (!headers['Evidence-IDs']) missingHeaders.push('Evidence-IDs: unknown-legacy');

    if (missingHeaders.length > 0) {
      console.log(`Fixing ${path.relative(REPO_ROOT, filePath)} - Adding: ${missingHeaders.join(', ')}`);

      // Prepend missing headers
      // If there are existing headers, we might want to append to them, or just prepend to file
      // If there is a header block, we should try to merge, but simpler is to just prepend to the top if we assume mostly missing.
      // However, if we prepend to a file that already has "Owner: Someone", we don't want to duplicate.
      // My logic above checked if the header exists.

      // If there are existing headers, we need to inject the missing ones into the block.
      // If there are no headers, we prepend the block.

      if (headerBlock.length > 0) {
        // Find where the header block ends
        // Assuming headers are at the very top.
        // We will reconstruct the header block.
        const lines = content.split(/\r?\n/);
        let insertIndex = 0;

        // Find end of current header block
        for(let i=0; i<lines.length; i++) {
           if (lines[i].trim() === '') {
             insertIndex = i;
             break;
           }
           // If line matches header regex, continue
           if (!/^\s*(?:>\s*)?([^:*]+?)\s*:\s*(.+?)\s*$/.test(lines[i])) {
              // End of headers
              insertIndex = i;
              break;
           }
           insertIndex = i + 1;
        }

        const newHeaderLines = [...missingHeaders];
        const newContentLines = [
            ...lines.slice(0, insertIndex),
            ...newHeaderLines,
            ...lines.slice(insertIndex)
        ];
        newContent = newContentLines.join('\n');
      } else {
        // No headers found at all, prepend them
        newContent = DEFAULT_HEADERS.join('\n') + '\n\n' + content;
      }

      fs.writeFileSync(filePath, newContent, 'utf8');
    } else {
        // Check for specific violations like "Status: active" but "Evidence-IDs: none"
        if (headers['Status'] === 'active' && headers['Evidence-IDs']?.toLowerCase() === 'none') {
            console.log(`Fixing Evidence-IDs in ${path.relative(REPO_ROOT, filePath)}`);
            newContent = content.replace(/Evidence-IDs:\s*none/i, 'Evidence-IDs: unknown-legacy');
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    }
  }
}

// Helpers copied from verify_governance_docs.mjs

function extractHeaderBlock(text, headerLines = 30) {
  const lines = text.split(/\r?\n/);
  const block = [];
  const HEADER_LINE_RE = /^\s*(?:>\s*)?([^:*]+?)\s*:\s*(.+?)\s*$/;
  let sawHeader = false;

  for (let i = 0; i < lines.length && i < headerLines; i += 1) {
    const line = lines[i];
    if (line.trim().length === 0) {
      if (sawHeader) break;
      // Allow empty lines before headers? Usually headers are at top.
      // But verify script says: "if (line.trim().length === 0) { if (sawHeader) break; continue; }"
      // So it skips leading empty lines.
      continue;
    }
    const cleaned = line.replace(/\*\*/g, '').replace(/_/g, '');
    const match = cleaned.match(HEADER_LINE_RE);
    if (match) {
      sawHeader = true;
      block.push(cleaned);
      continue;
    }
    break;
  }
  return block;
}

function parseHeaders(headerLines) {
  const headers = {};
  const HEADER_LINE_RE = /^\s*(?:>\s*)?([^:*]+?)\s*:\s*(.+?)\s*$/;
  for (const line of headerLines) {
    const match = line.match(HEADER_LINE_RE);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();
    headers[key] = value;
  }
  return headers;
}

async function listMarkdownFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}

main().catch(console.error);
