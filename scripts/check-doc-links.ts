#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// Configuration
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const IGNORE_FILE_PATH = path.join(ROOT_DIR, ".doclinkignore");

const IGNORE_PATTERNS = [/node_modules/, /^\./, /_includes/, /_site/, /dist/, /build/];

const IGNORE_LINKS = [/^http/, /^mailto:/, /^#/];

// Statistics
let totalFiles = 0;
let totalLinks = 0;
let brokenLinks = 0;
let ignoredBrokenLinks = 0;

// State
const fileCache = new Set();
const knownBrokenLinks = new Set();

// Load ignore file
if (fs.existsSync(IGNORE_FILE_PATH)) {
  const content = fs.readFileSync(IGNORE_FILE_PATH, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      knownBrokenLinks.add(trimmed);
    }
  });
}

const generateIgnoreMode = process.argv.includes("--generate-ignore");

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_PATTERNS.some((p) => p.test(file))) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (file.endsWith(".md")) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function checkFileExists(filePath) {
  if (fileCache.has(filePath)) return true;
  if (fs.existsSync(filePath)) {
    fileCache.add(filePath);
    return true;
  }
  return false;
}

function stripCodeBlocks(content) {
  // Remove fenced code blocks
  let stripped = content.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  stripped = stripped.replace(/`[^`]*`/g, "");
  return stripped;
}

function checkLinks(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");

  // Strip code blocks to avoid false positives
  content = stripCodeBlocks(content);

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  const fileDir = path.dirname(filePath);
  const relativeFilePath = path.relative(ROOT_DIR, filePath);

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    let linkUrl = match[2].trim();

    // Clean up title attribute if present: [text](url "title")
    if (linkUrl.includes(' "')) {
      linkUrl = linkUrl.split(' "')[0];
    }

    const originalLinkUrl = linkUrl;
    linkUrl = linkUrl.split("#")[0]; // Remove anchor

    if (IGNORE_LINKS.some((regex) => regex.test(linkUrl)) || linkUrl === "") {
      continue;
    }

    totalLinks++;

    // Resolve path relative to the current file
    let targetPath;
    if (linkUrl.startsWith("/")) {
      // Root relative
      targetPath = path.join(ROOT_DIR, linkUrl);
    } else {
      targetPath = path.join(fileDir, linkUrl);
    }

    // Simple query string stripping
    targetPath = targetPath.split("?")[0];

    // Decode URL
    try {
      targetPath = decodeURIComponent(targetPath);
    } catch (e) {
      // If decoding fails, treat as broken
    }

    if (!checkFileExists(targetPath)) {
      const issueKey = `${relativeFilePath}:${originalLinkUrl}`;

      if (knownBrokenLinks.has(issueKey)) {
        ignoredBrokenLinks++;
        continue; // Skip known broken link
      }

      if (generateIgnoreMode) {
        console.log(issueKey);
        brokenLinks++;
      } else {
        console.error(`❌ Broken link in ${relativeFilePath}: [${linkText}](${originalLinkUrl})`);
        brokenLinks++;
      }
    }
  }
}

async function main() {
  if (!generateIgnoreMode) {
    console.log("🔍 Starting documentation link check...");
  }

  const start = Date.now();

  const files = getAllFiles(DOCS_DIR);
  // Also check README.md in root
  const rootReadme = path.join(ROOT_DIR, "README.md");
  if (fs.existsSync(rootReadme)) {
    files.push(rootReadme);
  }

  totalFiles = files.length;

  if (!generateIgnoreMode) {
    console.log(`Checking ${totalFiles} markdown files...`);
  }

  files.forEach((file) => {
    checkLinks(file);
  });

  if (!generateIgnoreMode) {
    const duration = (Date.now() - start) / 1000;
    console.log(`\n🏁 Finished in ${duration.toFixed(2)}s`);
    console.log(
      `📊 Stats: ${totalFiles} files, ${totalLinks} links, ${brokenLinks} broken, ${ignoredBrokenLinks} ignored`
    );

    if (brokenLinks > 0) {
      console.error("❌ Documentation link check failed!");
      process.exit(1);
    } else {
      console.log("✅ All (non-ignored) internal links are valid.");
    }
  }
}

main().catch(console.error);
