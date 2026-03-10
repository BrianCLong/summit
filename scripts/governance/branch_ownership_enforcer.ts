import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ALLOWED_PREFIXES = ['feature/', 'fix/', 'chore/', 'governance/', 'docs/', 'refactor/', 'test/'];

interface HeatmapEntry {
    owner: string;
    fileCount: number;
    linesChanged: number; // Rough estimate or just files
}

function getBranchName(): string {
    const headRef = process.env.GITHUB_HEAD_REF;
    if (headRef) return headRef;

    try {
        if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function validateBranchName(branch: string): string | null {
    // Return the prefix if valid, null otherwise
    for (const prefix of ALLOWED_PREFIXES) {
        if (branch.startsWith(prefix)) {
            return prefix.replace('/', '');
        }
    }
    // Allow Jules agent generated branch names during development
    if (branch.startsWith('jules-')) {
        return 'chore';
    }
    return null;
}

function loadCodeOwners(): { pattern: RegExp, owners: string[] }[] {
    const ownersFile = fs.existsSync('.github/CODEOWNERS') ? '.github/CODEOWNERS' : (fs.existsSync('CODEOWNERS') ? 'CODEOWNERS' : null);

    if (!ownersFile) {
        console.warn('⚠️ No CODEOWNERS file found.');
        return [];
    }

    const lines = fs.readFileSync(ownersFile, 'utf-8').split('\n');
    const rules: { pattern: RegExp, owners: string[] }[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;

        const patternStr = parts[0];
        const owners = parts.slice(1);

        // Very basic conversion of gitignore/codeowners pattern to regex
        let regexStr = patternStr.replace(/\./g, '\\.');
        if (regexStr.startsWith('/')) {
            regexStr = '^' + regexStr.slice(1);
        } else if (regexStr === '*') {
             regexStr = '.*';
        } else {
             // For cases like "foo/" meaning any foo/ directory
             regexStr = '.*' + regexStr;
        }
        if (regexStr.endsWith('/')) {
            regexStr = regexStr + '.*';
        }
        regexStr = regexStr.replace(/\*/g, '.*');

        try {
            rules.push({ pattern: new RegExp(regexStr), owners });
        } catch (e) {
            console.warn(`Could not parse CODEOWNERS rule: ${patternStr}`);
        }
    }

    // Reverse so last match wins
    return rules.reverse();
}

function getOwnerForFile(file: string, rules: { pattern: RegExp, owners: string[] }[]): string[] {
    for (const rule of rules) {
        if (rule.pattern.test(file)) {
            return rule.owners;
        }
    }
    return ['@intelgraph-core']; // Fallback
}

async function main() {
    console.log('🔍 Enforcing Branch Naming Conventions and Ownership...');

    const prNumber = process.env.GITHUB_ISSUE_NUMBER || process.env.PR_NUMBER;
    const branchName = getBranchName();

    console.log(`Branch Name: ${branchName}`);

    const prefix = validateBranchName(branchName);

    if (!prefix) {
        console.error(`❌ Invalid branch name: '${branchName}'. Must start with one of: ${ALLOWED_PREFIXES.join(', ')}`);
        process.exit(1);
    }

    console.log(`✅ Valid branch prefix: ${prefix}`);

    // Get changed files
    let changedFiles: string[] = [];

    try {
        if (prNumber && process.env.GITHUB_ACTIONS) {
            console.log(`Fetching changed files for PR #${prNumber} via gh cli...`);
            const out = execSync(`gh pr view ${prNumber} --json files --jq '.files.[].path'`, { encoding: 'utf-8' });
            changedFiles = out.split('\n').filter(Boolean);
        } else {
            // Local test fallback
            console.log(`Fetching changed files via git diff...`);
            const baseRef = process.env.GITHUB_BASE_REF || 'main';
            const out = execSync(`git diff --name-only origin/${baseRef}...HEAD`, { encoding: 'utf-8' });
            changedFiles = out.split('\n').filter(Boolean);
        }
    } catch (e) {
        console.warn('⚠️ Could not get changed files. Details:', e.message);
    }

    if (changedFiles.length === 0) {
        console.log('No files changed (or could not determine). Exiting.');
        return;
    }

    console.log(`Found ${changedFiles.length} changed files.`);

    const rules = loadCodeOwners();
    const heatmap = new Map<string, number>();

    for (const file of changedFiles) {
        const owners = getOwnerForFile(file, rules);
        for (const owner of owners) {
            heatmap.set(owner, (heatmap.get(owner) || 0) + 1);
        }
    }

    // Build labels
    const labelsToAdd = new Set<string>();
    labelsToAdd.add(`type: ${prefix}`);

    for (const [owner, _count] of heatmap.entries()) {
        labelsToAdd.add(`owner: ${owner}`);
    }

    console.log(`Labels to add: ${Array.from(labelsToAdd).join(', ')}`);

    if (prNumber) {
        try {
            console.log(`Adding labels to PR #${prNumber}...`);
            // Add labels one by one or join them properly for the gh cli
            const labelsArray = Array.from(labelsToAdd);
            let addArgs = '';
            for (const label of labelsArray) {
                 addArgs += `--add-label "${label}" `;
            }
            execSync(`gh pr edit ${prNumber} ${addArgs.trim()}`);
            console.log('✅ Labels added successfully.');
        } catch (e) {
             console.error('❌ Failed to add labels via gh cli.', e.message);
        }
    } else {
        console.log('No PR number found (not running in PR context). Skipping label assignment.');
    }

    // Generate Markdown Heatmap
    const sortedHeatmap = Array.from(heatmap.entries()).sort((a, b) => b[1] - a[1]);

    let md = `## 🗺️ Subsystem Ownership Heatmap\n\n`;
    md += `| Owner | Files Touched |\n`;
    md += `|-------|---------------|\n`;
    for (const [owner, count] of sortedHeatmap) {
        md += `| \`${owner}\` | ${count} |\n`;
    }

    console.log('\n' + md);

    if (process.env.GITHUB_STEP_SUMMARY) {
        try {
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
            console.log('✅ Heatmap written to GITHUB_STEP_SUMMARY');
        } catch (e) {
            console.error('❌ Failed to write to GITHUB_STEP_SUMMARY', e.message);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
