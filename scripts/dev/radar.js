#!/usr/bin/env tsx
"use strict";
/**
 * Developer Radar Generator
 *
 * Generates a dashboard showing:
 * - Test health (flaky, slow)
 * - Hotspots (churn)
 * - Ownership gaps
 * - Open PR load
 * - Broken windows (neglected files)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
// Configuration
const DAYS_FOR_CHURN = 30;
const MAX_HOTSPOTS = 20;
const OUTPUT_JSON = path_1.default.join(ROOT_DIR, 'radar.json');
const OUTPUT_MD = path_1.default.join(ROOT_DIR, 'radar.md');
/**
 * Execute shell command
 */
function run(cmd, cwd = ROOT_DIR) {
    try {
        return (0, child_process_1.execSync)(cmd, { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim();
    }
    catch (e) {
        // console.warn(`Command failed: ${cmd}`, e.message);
        return '';
    }
}
/**
 * Get Hotspots (Churn)
 */
function getHotspots() {
    console.log('Calculating hotspots...');
    const cmd = `git log --since="${DAYS_FOR_CHURN} days ago" --name-only --format=""`;
    const output = run(cmd);
    const fileCounts = {};
    output.split('\n').forEach(line => {
        const file = line.trim();
        if (file && fs_1.default.existsSync(path_1.default.join(ROOT_DIR, file))) {
            fileCounts[file] = (fileCounts[file] || 0) + 1;
        }
    });
    return Object.entries(fileCounts)
        .map(([file, score]) => ({ file, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_HOTSPOTS);
}
/**
 * Convert gitignore-style pattern to Regex
 */
function patternToRegex(pattern) {
    let p = pattern;
    // Escape special regex characters
    p = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Handle * (wildcard)
    // We need to handle cases like *.js -> .*\.js
    p = p.replace(/\*/g, '.*');
    // Handle ? (single char)
    p = p.replace(/\?/g, '.');
    // Handle /
    // If starts with /, match from start
    if (p.startsWith('/')) {
        p = '^' + p.substring(1);
    }
    else {
        // Match anywhere? No, usually CODEOWNERS matches relative to root if not anchored
        // But per gitignore rules, if no slash, it matches in any directory.
        // CODEOWNERS format:
        // "Pattern followed by one or more owners."
        // "If the pattern ends with /, it matches a directory"
        // "If the pattern starts with /, it matches relative to repo root"
        // "Otherwise it matches anywhere"
        p = '.*' + p;
    }
    // If ends with /, match directory contents
    if (p.endsWith('/')) {
        p = p + '.*';
    }
    else {
        // If not ending in slash, ensure we match end of string or path boundary?
        // CODEOWNERS behavior is complex.
        // "foo.txt" matches "foo.txt", "bar/foo.txt"
        // "/foo.txt" matches "foo.txt" only
        // "*.js" matches "a.js", "b/c.js"
        p = p + '$';
    }
    return new RegExp(p);
}
/**
 * Get Ownership Gaps
 */
function getOwnership() {
    console.log('Analyzing ownership...');
    // Parse CODEOWNERS
    const codeownersPath = path_1.default.join(ROOT_DIR, '.github/CODEOWNERS');
    let patterns = [];
    if (fs_1.default.existsSync(codeownersPath)) {
        const content = fs_1.default.readFileSync(codeownersPath, 'utf-8');
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const parts = line.split(/\s+/);
                const pattern = parts[0];
                const owners = parts.slice(1);
                try {
                    patterns.push({ regex: patternToRegex(pattern), owners });
                }
                catch (e) {
                    console.warn(`Invalid regex for pattern: ${pattern}`);
                }
            }
        });
    }
    // List all files
    const allFiles = run('git ls-files').split('\n').filter(f => f);
    const unownedFiles = [];
    for (const file of allFiles) {
        let hasOwner = false;
        // Check patterns in reverse order (last match wins)
        for (let i = patterns.length - 1; i >= 0; i--) {
            if (patterns[i].regex.test(file)) {
                hasOwner = true;
                break;
            }
        }
        if (!hasOwner) {
            unownedFiles.push(file);
        }
    }
    return {
        totalFiles: allFiles.length,
        unownedFiles: unownedFiles.length,
        ownershipGaps: unownedFiles.slice(0, 20),
    };
}
/**
 * Get Test Health
 */
function getTestHealth() {
    console.log('Checking test health...');
    // Look for junit.xml
    const possiblePaths = [
        'junit.xml',
        'server/junit.xml',
        'test-results.xml',
        'test-results/junit.xml'
    ];
    let foundPath = '';
    for (const p of possiblePaths) {
        if (fs_1.default.existsSync(path_1.default.join(ROOT_DIR, p))) {
            foundPath = path_1.default.join(ROOT_DIR, p);
            break;
        }
    }
    if (!foundPath) {
        console.log('No JUnit XML report found. Skipping test health.');
        return {
            status: 'unknown',
            flakyTests: [],
            slowTests: []
        };
    }
    // Naive XML parsing
    const content = fs_1.default.readFileSync(foundPath, 'utf-8');
    // Find slow tests (duration > 5s)
    const slowTests = [];
    const testCaseRegex = /<testcase[^>]+name="([^"]+)"[^>]+time="([^"]+)"/g;
    let match;
    while ((match = testCaseRegex.exec(content)) !== null) {
        const name = match[1];
        const time = parseFloat(match[2]);
        if (time > 5) {
            slowTests.push({ name, duration: time });
        }
    }
    // Sort by duration
    slowTests.sort((a, b) => b.duration - a.duration);
    return {
        status: 'healthy', // Placeholder
        flakyTests: [], // Needs history
        slowTests: slowTests.slice(0, 10),
    };
}
/**
 * Get PR Load
 */
function getPRLoad() {
    console.log('Fetching PR load...');
    // Try to use GH API
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.log('No GITHUB_TOKEN found. Skipping PR load.');
        return { totalOpen: 0, byLabel: {}, aging: 0 };
    }
    try {
        const repo = process.env.GITHUB_REPOSITORY || 'IntelGraph/intelgraph-platform'; // Fallback
        const cmd = `curl -s -H "Authorization: token ${token}" "https://api.github.com/repos/${repo}/pulls?state=open&per_page=100"`;
        const jsonStr = run(cmd);
        // Check if response is valid JSON array
        let json;
        try {
            json = JSON.parse(jsonStr);
        }
        catch (e) {
            console.warn('Failed to parse GitHub API response');
            return { totalOpen: 0, byLabel: {}, aging: 0 };
        }
        if (!Array.isArray(json)) {
            console.warn('GitHub API response is not an array', json);
            return { totalOpen: 0, byLabel: {}, aging: 0 };
        }
        const byLabel = {};
        let aging = 0;
        const now = new Date();
        json.forEach((pr) => {
            pr.labels.forEach((l) => {
                byLabel[l.name] = (byLabel[l.name] || 0) + 1;
            });
            const created = new Date(pr.created_at);
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30)
                aging++;
        });
        return {
            totalOpen: json.length,
            byLabel,
            aging
        };
    }
    catch (e) {
        console.error('Failed to fetch PRs', e);
        return { totalOpen: 0, byLabel: {}, aging: 0 };
    }
}
/**
 * Get Broken Windows
 */
function getBrokenWindows() {
    console.log('Identifying broken windows...');
    // Find files with many TODOs
    // grep -c returns "file:count"
    const cmd = `grep -r "TODO" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=coverage | cut -d: -f1 | sort | uniq -c | sort -nr | head -20`;
    const output = run(cmd);
    const topWithTodos = [];
    output.split('\n').forEach(line => {
        line = line.trim();
        if (!line)
            return;
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            const count = parseInt(parts[0], 10);
            const file = parts[1];
            if (file) {
                topWithTodos.push({ file, count });
            }
        }
    });
    return {
        neglectedFilesCount: 0, // Placeholder
        topNeglected: [],
        topWithTodos
    };
}
/**
 * Generate Markdown
 */
function generateMarkdown(data) {
    const date = new Date(data.generatedAt).toLocaleDateString();
    let md = `# Developer Radar - ${date}\n\n`;
    md += `## 🔥 Hotspots (Churn - Last ${DAYS_FOR_CHURN} Days)\n\n`;
    md += `| File | Score |\n|---|---|\n`;
    data.hotspots.forEach(h => {
        md += `| \`${h.file}\` | ${h.score} |\n`;
    });
    md += `\n## 🗺️ Ownership Gaps\n\n`;
    md += `- **Unowned Files**: ${data.ownership.unownedFiles} / ${data.ownership.totalFiles}\n`;
    md += `- **Top Unowned Files**:\n`;
    data.ownership.ownershipGaps.forEach(f => {
        md += `  - \`${f}\`\n`;
    });
    md += `\n## 🧪 Test Health\n\n`;
    md += `- **Status**: ${data.testHealth.status}\n`;
    if (data.testHealth.slowTests.length > 0) {
        md += `### 🐢 Slow Tests\n\n`;
        md += `| Test | Duration (s) |\n|---|---|\n`;
        data.testHealth.slowTests.forEach(t => {
            md += `| ${t.name} | ${t.duration.toFixed(2)} |\n`;
        });
    }
    else {
        md += `_No slow tests detected (or no test results found)._\n`;
    }
    md += `\n## 📥 Open PR Load\n\n`;
    md += `- **Total Open**: ${data.prLoad.totalOpen}\n`;
    md += `- **Aging (>30 days)**: ${data.prLoad.aging}\n`;
    md += `- **By Label**:\n`;
    Object.entries(data.prLoad.byLabel).forEach(([label, count]) => {
        md += `  - \`${label}\`: ${count}\n`;
    });
    md += `\n## 🪟 Broken Windows (High TODOs)\n\n`;
    md += `| File | TODO Count |\n|---|---|\n`;
    data.brokenWindows.topWithTodos.forEach(t => {
        md += `| \`${t.file}\` | ${t.count} |\n`;
    });
    return md;
}
/**
 * Main
 */
async function main() {
    const data = {
        generatedAt: new Date().toISOString(),
        hotspots: getHotspots(),
        ownership: getOwnership(),
        testHealth: getTestHealth(),
        prLoad: getPRLoad(),
        brokenWindows: getBrokenWindows(),
    };
    // Write JSON
    fs_1.default.writeFileSync(OUTPUT_JSON, JSON.stringify(data, null, 2));
    console.log(`JSON report written to ${OUTPUT_JSON}`);
    // Write Markdown
    const md = generateMarkdown(data);
    fs_1.default.writeFileSync(OUTPUT_MD, md);
    console.log(`Markdown dashboard written to ${OUTPUT_MD}`);
    // Also update docs/dev/radar-dashboard.md if it exists or create it
    const docsPath = path_1.default.join(ROOT_DIR, 'docs/dev/radar-dashboard.md');
    const docsDir = path_1.default.dirname(docsPath);
    if (!fs_1.default.existsSync(docsDir)) {
        fs_1.default.mkdirSync(docsDir, { recursive: true });
    }
    fs_1.default.writeFileSync(docsPath, md);
    console.log(`Dashboard docs updated at ${docsPath}`);
}
main();
