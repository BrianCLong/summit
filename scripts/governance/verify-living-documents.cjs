// scripts/governance/verify-living-documents.js

const fs = require('fs').promises;
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../../');
const CONFIG_PATH = path.join(REPO_ROOT, 'docs/governance/living-documents.json');

/**
 * Lists all subdirectories within a given directory.
 * @param {string} dirPath - The path to the directory, relative to the repo root.
 * @returns {Promise<string[]>} A list of directory names.
 */
async function getDirectoryListing(dirPath) {
    const absolutePath = path.join(REPO_ROOT, dirPath);
    try {
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
    } catch (error) {
        console.error(`Error reading directory at ${absolutePath}:`, error);
        return [];
    }
}

/**
 * Generates the Markdown content for the service inventory table.
 * @param {string[]} services - A list of service names.
 * @returns {string} The generated Markdown content.
 */
function generateServiceMarkdown(services) {
    const header = `<!-- This section is automatically generated. Do not edit manually. -->
| Service | Port | Governance Hooks | Authority | Provenance | PII Detection |
|---------|------|------------------|-----------|------------|---------------|`;

    // For this proof-of-concept, other columns are placeholders.
    // A future enhancement could read metadata from each service directory.
    const rows = services.sort().map(service => `| ${service} | TBD | TBD | TBD | TBD | TBD |`);

    return `${header}\n${rows.join('\n')}`;
}

/**
 * Processes a single rule from the configuration file.
 * @param {object} rule - The rule object.
 * @returns {Promise<boolean>} True if the document was changed, otherwise false.
 */
async function processRule(rule) {
    console.log(`Processing rule for ${rule.document}...`);

    let generatedContent;
    if (rule.source.type === 'directory_listing') {
        const services = await getDirectoryListing(rule.source.path);
        generatedContent = generateServiceMarkdown(services);
    } else {
        console.warn(`Unsupported source type: ${rule.source.type} for document ${rule.document}`);
        return false;
    }

    const documentPath = path.join(REPO_ROOT, rule.document);
    const originalContent = await fs.readFile(documentPath, 'utf8');

    const startMarker = `<!-- ${rule.marker}:START -->`;
    const endMarker = `<!-- ${rule.marker}:END -->`;

    const startIndex = originalContent.indexOf(startMarker);
    const endIndex = originalContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error(`Error: Markers '${startMarker}' or '${endMarker}' not found in ${rule.document}`);
        // This is a configuration error, so we should fail the check.
        throw new Error(`Markers not found in ${rule.document}`);
    }

    const contentBefore = originalContent.substring(0, startIndex + startMarker.length);
    const contentAfter = originalContent.substring(endIndex);

    // Extract existing content, normalize by trimming whitespace for comparison.
    const existingContent = originalContent.substring(startIndex + startMarker.length, endIndex).trim();
    const newContent = generatedContent.trim();

    if (existingContent === newContent) {
        console.log(`- ${rule.document} is up to date.`);
        return false;
    }

    console.log(`- ${rule.document} is out of date. Updating...`);

    const { execSync } = require('child_process');

    const fullNewContent = `${contentBefore}\n${generatedContent}\n${contentAfter}`;

    // Write the raw generated content first
    await fs.writeFile(documentPath, fullNewContent, 'utf8');
    
    // Apply Prettier to stabilize the format
    try {
        execSync(`npx prettier --write "${documentPath}"`, { stdio: 'ignore' });
    } catch (e) {
        console.warn('Warning: Failed to run prettier on updated document.');
    }

    // Read it back to compare with original
    const finalizedContent = await fs.readFile(documentPath, 'utf8');
    
    if (finalizedContent === originalContent) {
        console.log(`- ${rule.document} is up to date (after formatting).`);
        return false;
    }

    console.log(`- ${rule.document} updated and formatted.`);
    return true;
}

/**
 * Main function to run the verification script.
 */
async function main() {
    let filesChanged = false;
    try {
        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(configContent);

        for (const rule of config.rules) {
            const changed = await processRule(rule);
            if (changed) {
                filesChanged = true;
            }
        }
    } catch (error) {
        console.error("\nError running verify-living-documents script:", error);
        process.exit(1);
    }

    if (filesChanged) {
        console.log("\nOne or more documents were updated. Exiting with status 1 to indicate changes.");
        process.exit(1);
    } else {
        console.log("\nAll documents are up to date.");
        process.exit(0);
    }
}

main();
