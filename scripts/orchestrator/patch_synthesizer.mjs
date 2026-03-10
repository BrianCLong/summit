/**
 * Phase 4.5: Patch Synthesizer
 *
 * Consumes ReconstructionBundle JSON outputs and generates git-applicable .diff patches
 * representing the restored capabilities.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ARTIFACTS_DIR = 'artifacts';
const BUNDLES_DIR = path.join(ARTIFACTS_DIR, 'reconstruction_bundles');
const PATCHES_DIR = path.join(ARTIFACTS_DIR, 'patches');

async function synthesizePatches() {
    try {
        console.log("Starting Phase 4.5: Patch Synthesis...");
        await fs.mkdir(PATCHES_DIR, { recursive: true });

        // 1. Check if bundles directory exists
        let bundleFiles = [];
        try {
            bundleFiles = await fs.readdir(BUNDLES_DIR);
        } catch (err) {
            console.log(`No reconstruction bundles found in ${BUNDLES_DIR}. Phase 4.5 skipping.`);
            return;
        }

        const jsonFiles = bundleFiles.filter(f => f.endsWith('.json'));
        if (jsonFiles.length === 0) {
            console.log(`No JSON reconstruction bundles found. Phase 4.5 skipping.`);
            return;
        }

        console.log(`Found ${jsonFiles.length} reconstruction bundles.`);
        let generatedCount = 0;

        for (const file of jsonFiles) {
            const bundlePath = path.join(BUNDLES_DIR, file);
            const rawData = await fs.readFile(bundlePath, 'utf8');
            let bundle;
            try {
                bundle = JSON.parse(rawData);
            } catch (err) {
                console.warn(`Failed to parse ${bundlePath}, skipping.`);
                continue;
            }

            // 2. Synthesize Patch for Bundle
            if (!bundle.bundle_id || !bundle.capability || !bundle.fragments) {
                console.warn(`Bundle ${file} is missing required fields, skipping.`);
                continue;
            }

            const patchContent = generateGitPatch(bundle);
            if (patchContent) {
                const patchName = `patch_${bundle.bundle_id}_${bundle.capability.replace(/[^a-zA-Z0-9]/g, '_')}.diff`;
                const patchPath = path.join(PATCHES_DIR, patchName);

                await fs.writeFile(patchPath, patchContent, 'utf8');
                generatedCount++;
                console.log(`  -> Synthesized patch: ${patchPath}`);
            }
        }

        console.log(`Phase 4.5 Complete. Synthesized ${generatedCount} git patches.`);

    } catch (error) {
        console.error("Error during patch synthesis:", error);
        process.exit(1);
    }
}

/**
 * Generates a mock/structural git patch representing the restored capability
 * In a real implementation, this would look up the actual fragments by ID,
 * merge them AST-safely, and output a valid diff string.
 * @param {Object} bundle
 * @returns {string} The generated patch content
 */
function generateGitPatch(bundle) {
    let diff = '';
    const date = new Date().toISOString();

    // Header
    diff += `From: GTSE Patch Synthesizer <gtse@summit.local>\n`;
    diff += `Date: ${date}\n`;
    diff += `Subject: [PATCH] Reconstruct capability: ${bundle.capability}\n\n`;
    diff += `Reconstruction Bundle ID: ${bundle.bundle_id}\n`;
    diff += `Confidence: ${bundle.confidence || 'unknown'}\n`;
    diff += `Synthesis Strategy: ${bundle.synthesis_strategy || 'merge+repair'}\n`;
    diff += `Fragments used: ${bundle.fragments.length}\n\n`;

    // In a full implementation, we'd iterate over target_paths and mapped fragments
    // Here we generate a structural diff for the primary target path
    const targetFile = (bundle.target_paths && bundle.target_paths.length > 0)
        ? bundle.target_paths[0]
        : `src/reconstructed/${bundle.capability.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ts`;

    diff += `--- a/${targetFile}\n`;
    diff += `+++ b/${targetFile}\n`;
    diff += `@@ -0,0 +1,15 @@\n`;
    diff += `+// Reconstructed Capability: ${bundle.capability}\n`;
    diff += `+// Restored from fragments: ${bundle.fragments.join(', ')}\n`;
    diff += `+\n`;
    diff += `+export class Reconstructed${capitalize(bundle.capability.replace(/[^a-zA-Z0-9]/g, ''))} {\n`;
    diff += `+    constructor() {\n`;
    diff += `+        console.log('Restored capability initialized.');\n`;
    diff += `+    }\n`;
    diff += `+\n`;
    diff += `+    execute() {\n`;
    diff += `+        // Synthesized logic from ${bundle.fragments.length} historical fragments\n`;
    diff += `+        return true;\n`;
    diff += `+    }\n`;
    diff += `+}\n`;

    return diff;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Execute if run directly
if (process.argv[1] === new URL(import.meta.url).pathname ) {
    synthesizePatches();
}

export { synthesizePatches, generateGitPatch };
