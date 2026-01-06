#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const SCRIPT_DIR = 'scripts/release';
const REGISTRY_FILE = 'docs/releases/reason-codes.yml';

function main() {
    let unknownCodeFound = false;
    const knownCodes = new Set();
    const duplicates = new Set();

    // 1. Load and validate registry
    console.log(`Loading reason code registry from ${REGISTRY_FILE}...`);
    const registry = yaml.load(readFileSync(REGISTRY_FILE, 'utf8'));

    for (const category in registry) {
        if (Array.isArray(registry[category])) {
            for (const item of registry[category]) {
                if (knownCodes.has(item.code)) {
                    duplicates.add(item.code);
                }
                knownCodes.add(item.code);
            }
        }
    }

    if (duplicates.size > 0) {
        console.error('❌ Error: Duplicate reason codes found in registry:');
        duplicates.forEach(code => console.error(`  - ${code}`));
        process.exit(1);
    }
    console.log(`✅ Registry loaded with ${knownCodes.size} unique codes.`);

    // 2. Scan scripts for codes
    console.log(`\nScanning files in ${SCRIPT_DIR} for reason codes...`);
    const files = readdirSync(SCRIPT_DIR).filter(f => f.endsWith('.mjs') || f.endsWith('.js'));

    // Scan for direct usage of string literals, which should be avoided now.
    // However, since we replaced them with constants, we might want to check for constant usage or simply that we didn't leave any strings.
    // The previous regex looked for string literals. If we did our job, those should be gone (except in reason-codes.mjs itself).

    for (const file of files) {
        // Skip reason-codes.mjs as it defines them
        if (file === 'reason-codes.mjs') continue;

        const filePath = join(SCRIPT_DIR, file);
        const content = readFileSync(filePath, 'utf8');

        // Regex to catch remaining string literal codes
        // We look for code: 'STRING' or addError('STRING')
        const codeRegex = /(?:code|reason):\s*['"`]([A-Z0-9_]+)['"`]/g;
        const literalRegex = /addError\(\s*['"`]([A-Z0-9_]+)['"`]/g;

        let match;
        while ((match = codeRegex.exec(content)) !== null) {
            const foundCode = match[1];
            // If it matches a known code, it's a string literal we failed to replace!
            if (knownCodes.has(foundCode)) {
                if (!unknownCodeFound) {
                    console.error('\n❌ Error: Found raw string reason codes (should use constants):');
                    unknownCodeFound = true;
                }
                const lineNumber = content.substring(0, match.index).split('\n').length;
                console.error(`  - Raw Code: '${foundCode}' in ${filePath}:${lineNumber}`);
            }
        }

        while ((match = literalRegex.exec(content)) !== null) {
            const foundCode = match[1];
            if (knownCodes.has(foundCode)) {
                if (!unknownCodeFound) {
                    console.error('\n❌ Error: Found raw string reason codes (should use constants):');
                    unknownCodeFound = true;
                }
                const lineNumber = content.substring(0, match.index).split('\n').length;
                console.error(`  - Raw Code: '${foundCode}' in ${filePath}:${lineNumber}`);
            }
        }
    }

    if (unknownCodeFound) {
        console.error('\nPlease add the unknown codes to the registry file: docs/releases/reason-codes.yml');
        process.exit(1);
    }

    console.log('\n✅ All reason codes found in scripts are valid and exist in the registry.');
}

main();
