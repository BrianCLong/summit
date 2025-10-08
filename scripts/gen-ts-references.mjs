#!/usr/bin/env node

/**
 * Generate TypeScript project references for the monorepo
 * 
 * This script automatically discovers all tsconfig.json files in the project
 * and creates a root tsconfig.json with references to all of them.
 */

import { promises as fs } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root directory of the project
const rootDir = join(__dirname, '..');

// Function to find all tsconfig.json files
async function findAllTsConfigs(dir) {
  const tsconfigs = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip node_modules and other ignored directories
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.next' ||
        entry.name.startsWith('.') ||
        entry.name.includes('disabled')
      ) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subConfigs = await findAllTsConfigs(fullPath);
        tsconfigs.push(...subConfigs);
      } else if (entry.name === 'tsconfig.json') {
        // Exclude the root tsconfig.json
        if (fullPath !== join(rootDir, 'tsconfig.json')) {
          tsconfigs.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore errors when reading directories
    console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
  }
  
  return tsconfigs;
}

// Main function
async function main() {
  try {
    // Find all tsconfig.json files
    const tsconfigs = await findAllTsConfigs(rootDir);
    
    // Convert absolute paths to relative paths and create reference objects
    const references = tsconfigs
      .map(tsconfigPath => {
        const relativePath = relative(rootDir, dirname(tsconfigPath));
        return { path: relativePath };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
    
    // Read the existing root tsconfig.json
    const rootTsConfigPath = join(rootDir, 'tsconfig.json');
    const rootTsConfigContent = await fs.readFile(rootTsConfigPath, 'utf-8');
    const rootTsConfig = JSON.parse(rootTsConfigContent);
    
    // Update the references
    rootTsConfig.references = references;
    
    // Write the updated tsconfig.json
    await fs.writeFile(
      rootTsConfigPath,
      JSON.stringify(rootTsConfig, null, 2) + '\n'
    );
    
    console.log(`✅ Updated ${references.length} project references in tsconfig.json`);
  } catch (error) {
    console.error('❌ Error updating tsconfig.json:', error);
    process.exit(1);
  }
}

// Run the script
main();