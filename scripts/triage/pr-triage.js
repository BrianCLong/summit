"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getPRs() {
    try {
        // Try using gh CLI
        const output = (0, child_process_1.execSync)('gh pr list --state open --json number,title,headRefName,author,updatedAt,labels,checks --limit 50', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        return JSON.parse(output);
    }
    catch (e) {
        // Fallback to local file if gh is missing
        const manualFile = path.join(process.cwd(), 'prs.json');
        if (fs.existsSync(manualFile)) {
            console.log('Docs: "gh" CLI not found. Using local prs.json for triage.');
            return JSON.parse(fs.readFileSync(manualFile, 'utf-8'));
        }
        console.error('Error: "gh" CLI not found and no prs.json provided.');
        console.error('To generate a triage report, either install gh CLI or provide a valid prs.json export.');
        process.exit(1);
    }
}
function analyzePR(pr) {
    let status = 'Unknown';
    let failingChecks = [];
    // Determine overall status
    // Note: 'checks' structure varies. Assuming a simplified checkRollup or similar if using generic JSON.
    // In reality, GH CLI returns detailed check info. For this script, we look for simple indicators.
    // Mock logic for status classification
    const isGreen = pr.checks?.every(c => c.state === 'PASS' || c.state === 'SUCCESS') ?? false; // This is a simplification
    if (isGreen) {
        status = 'Merge-ready';
    }
    else {
        status = 'Needs Inspection';
        // In a real script, we would parse pr.checks to find failing ones
        failingChecks.push('Check logs');
    }
    // Override based on labels
    if (pr.labels.some(l => l.name === 'blocked'))
        status = 'Blocked';
    return {
        number: pr.number,
        title: pr.title,
        author: pr.author.login,
        status,
        failingChecks,
        updatedAt: pr.updatedAt
    };
}
function generateReport(prs) {
    const analyzed = prs.map(analyzePR);
    console.log('# Merge Train Triage Report');
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log('');
    console.log('| PR | Status | Author | Updated |');
    console.log('| :--- | :--- | :--- | :--- |');
    analyzed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    analyzed.forEach(pr => {
        console.log(`| #${pr.number} ${pr.title.slice(0, 40)}... | ${pr.status} | ${pr.author} | ${new Date(pr.updatedAt).toLocaleDateString()} |`);
    });
    console.log('');
    console.log('## Action Items');
    console.log('- **Merge-ready**: Review and merge immediately.');
    console.log('- **Blocked**: Check specific failures using `pnpm ci:cluster`.');
}
const prs = getPRs();
generateReport(prs);
