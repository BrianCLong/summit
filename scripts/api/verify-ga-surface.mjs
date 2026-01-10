#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const apiSurfacesDoc = path.join(repoRoot, 'docs/api/GA_API_SURFACES.md');
const timeoutMs = 3000;

// Simple regex to find URLs in markdown table rows.
// Looks for a row starting with '|', captures the first absolute http URL it finds.
const urlRegex = /^\|.*?(https?:\/\/[^\s`]+)/;

async function getApiEndpoints() {
    const endpoints = [];
    try {
        const content = await fs.readFile(apiSurfacesDoc, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(urlRegex);
            if (match && match[1]) {
                endpoints.push(match[1]);
            }
        }
    } catch (error) {
        console.error(`❌ Could not read or parse ${apiSurfacesDoc}`);
        throw error;
    }
    return endpoints;
}

async function checkEndpoint(url) {
    console.log(`- Verifying: ${url}`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, { signal: controller.signal });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log(`  ✅ OK (${response.status})`);
            return true;
        } else {
            console.error(`  ❌ FAILED (${response.status})`);
            return false;
        }
    } catch (error) {
        console.error(`  ❌ FAILED (Error: ${error.message})`);
        return false;
    }
}

async function main() {
    console.log('🔎 Verifying GA API Surface contract...');
    const endpoints = await getApiEndpoints();

    if (endpoints.length === 0) {
        console.error('❌ No API endpoints found in the documentation. The parser might be broken.');
        process.exit(1);
    }

    console.log(`Found ${endpoints.length} HTTP endpoints to check.`);

    const results = await Promise.all(endpoints.map(checkEndpoint));
    const failures = results.filter(r => !r).length;

    if (failures > 0) {
        console.error(`\n🔥 ${failures} GA API surface check(s) failed. This is a breaking change.`);
        process.exit(1);
    } else {
        console.log('\n🎉 All GA API surface checks passed.');
    }
}

main().catch(err => {
    console.error('\n🚨 Verification script crashed:', err);
    process.exit(1);
});
