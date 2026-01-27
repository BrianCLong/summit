#!/usr/bin/env node

/**
 * Summit MCP Tool UX Linter
 * Enforces "Golden Path" standards for MCP tools.
 */

import fs from 'fs';
import path from 'path';

const MAX_TOOLS = 15;
const NAMING_PATTERN = /^[a-z0-9]+_[a-z0-9]+_[a-z0-9_]+$/;
const DOCSTRING_REQUIREMENTS = [
  "When to use",
  "Arg format",
  "Return shape"
];

function lintFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const errors = [];

  // 1. Tool count check (approximate via .tool( calls)
  const toolMatches = content.match(/\.tool\s*\(/g) || [];
  if (toolMatches.length > MAX_TOOLS) {
    errors.push(`Too many tools defined (${toolMatches.length}). Target is 5-15 tools per server.`);
  }

  // 2. Scan for tool definitions and check naming/args
  // This is a simplified regex-based scan.
  const toolDefRegex = /\.tool\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*({[\s\S]*?})\s*,/g;
  let match;
  while ((match = toolDefRegex.exec(content)) !== null) {
    const [_, name, description, schema] = match;

    // Naming convention
    if (!NAMING_PATTERN.test(name)) {
      errors.push(`Tool "${name}" does not follow the {service}_{action}_{resource} pattern.`);
    }

    // Flat args check (looking for nested objects in the schema)
    // Very simple check: if we see z.object or z.record or nested braces
    if (schema.includes('z.object') || schema.includes('z.record') || (schema.match(/{/g) || []).length > 1) {
      // Allow the top level braces, but check for nested ones that look like object definitions
      if (schema.includes(': {') || schema.includes('z.object')) {
        errors.push(`Tool "${name}" appears to use nested objects in arguments. Prefer flat typed primitives.`);
      }
    }

    // Docstring requirements
    for (const req of DOCSTRING_REQUIREMENTS) {
      if (!description.includes(req)) {
        errors.push(`Tool "${name}" description is missing mandatory section: "${req}".`);
      }
    }

    // Pagination check for list-returning tools
    if (name.includes('list') || name.includes('search')) {
      if (!schema.includes('limit') || !schema.includes('offset')) {
        errors.push(`Tool "${name}" is a list-returning tool but lacks 'limit' or 'offset' in arguments.`);
      }
    }
  }

  // 3. Raw exception check
  if (content.includes('throw new Error') && !content.includes('actionable correction')) {
    // This is a bit loose, but encourages better errors
    if (content.match(/throw new Error\s*\(\s*["'][^"']{0,20}["']\s*\)/)) {
        errors.push(`Found generic Error throw. Ensure errors return actionable corrective guidance.`);
    }
  }

  return errors;
}

function main() {
  const targetDir = process.argv[2] || '.';
  console.log(`Linting MCP Tool UX in: ${targetDir}`);

  let totalErrors = 0;

  // Recursively find .ts files in src directories of mcp packages
  const files = [];
  const walk = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'dist') {
            walk(fullPath);
        }
      } else if (fullPath.endsWith('.ts')) {
        files.push(fullPath);
      }
    });
  };

  walk(targetDir);

  files.forEach(file => {
    const errors = lintFile(file);
    if (errors.length > 0) {
      console.error(`\n❌ ${file}:`);
      errors.forEach(err => console.error(`  - ${err}`));
      totalErrors += errors.length;
    }
  });

  if (totalErrors > 0) {
    console.error(`\nTotal MCP UX Errors: ${totalErrors}`);
    process.exit(1);
  } else {
    console.log('\n✅ All MCP tools comply with Summit Golden Path standards.');
  }
}

main();
