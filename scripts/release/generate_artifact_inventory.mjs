#!/usr/bin/env node

/**
 * scripts/release/generate_artifact_inventory.mjs
 * 
 * Generates specific inventory of release artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
import { canonicalJson, getSemanticTimestamp } from './lib/determinism.mjs';

function calculateSha256(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.json': 'application/json',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.html': 'text/html',
        '.css': 'text/css',
        '.map': 'application/json'
    };
    return map[ext] || 'application/octet-stream';
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

export function generateInventory(rootDir) {
    const artifacts = [];

    walkDir(rootDir, (filePath) => {
        const relPath = path.relative(rootDir, filePath);
        if (relPath === 'inventory.json') return; // Exclude self

        const stats = fs.statSync(filePath);
        artifacts.push({
            path: relPath,
            size: stats.size,
            sha256: calculateSha256(filePath),
            mimeType: getMimeType(filePath)
        });
    });

    // Sort by path for determinism
    artifacts.sort((a, b) => a.path.localeCompare(b.path));

    return {
        version: '1.0.0',
        generatedAt: getSemanticTimestamp(),
        artifacts
    };
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            root: { type: 'string', default: 'dist' },
            output: { type: 'string', default: 'dist/inventory.json' }
        }
    });

    const rootDir = path.resolve(values.root);
    const outputPath = path.resolve(values.output);

    console.log(`🔍 Generating Artifact Inventory for ${rootDir}`);
    if (!fs.existsSync(rootDir)) {
        console.error(`❌ Root directory not found: ${rootDir}`);
        process.exit(1);
    }

    const inventory = generateInventory(rootDir);
    fs.writeFileSync(outputPath, canonicalJson(inventory));
    console.log(`✅ Inventory written to ${outputPath} (${inventory.artifacts.length} items)`);
}
