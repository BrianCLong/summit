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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parse_diff_1 = __importDefault(require("parse-diff"));
const fs = __importStar(require("fs"));
const reviewer_1 = require("./reviewer");
function generateMarkdown(findings) {
    if (findings.length === 0) {
        return '## PR Review\n\n✅ No issues found by the automated reviewer.';
    }
    let md = '## PR Review Findings\n\n';
    // Group by severity
    const critical = findings.filter(f => f.severity === 'critical');
    const warning = findings.filter(f => f.severity === 'warning');
    const info = findings.filter(f => f.severity === 'info');
    if (critical.length > 0) {
        md += '### 🚨 Critical Issues (Must Fix)\n';
        critical.forEach(f => {
            md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
        });
        md += '\n';
    }
    if (warning.length > 0) {
        md += '### ⚠️ Warnings\n';
        warning.forEach(f => {
            md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
        });
        md += '\n';
    }
    if (info.length > 0) {
        md += '### ℹ️ Suggestions\n';
        info.forEach(f => {
            md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
        });
        md += '\n';
    }
    return md;
}
function main() {
    const args = process.argv.slice(2);
    const diffFile = args[0];
    if (!diffFile) {
        process.stderr.write('Usage: scan <diff-file>\n');
        process.exit(1);
    }
    try {
        const diffContent = fs.readFileSync(diffFile, 'utf8');
        const files = (0, parse_diff_1.default)(diffContent);
        // Convert to internal format if needed, but parse-diff matches our needs mostly
        // We cast to our type which is structurally compatible enough or we map it
        const diffFiles = files.map(f => ({
            to: f.to,
            from: f.from,
            chunks: f.chunks.map(c => ({
                content: c.content,
                changes: c.changes.map(ch => ({
                    type: ch.type,
                    content: ch.content,
                    ln1: ch.ln1 || ch.ln, // parse-diff types might vary
                    ln2: ch.ln2 || ch.ln
                }))
            }))
        }));
        const reviewer = new reviewer_1.Reviewer(diffFiles);
        const findings = reviewer.review();
        const output = {
            summary: generateMarkdown(findings),
            findings: findings,
            passed: !findings.some(f => f.severity === 'critical')
        };
        // Output JSON
        fs.writeFileSync('review_findings.json', JSON.stringify(output, null, 2));
        // Output Markdown
        fs.writeFileSync('review_findings.md', output.summary);
        process.stdout.write(`${output.summary}\n`);
        if (!output.passed) {
            process.stderr.write('CRITICAL ISSUES FOUND\n');
            process.exit(1);
        }
    }
    catch (error) {
        process.stderr.write(`Error processing diff: ${error}\n`);
        process.exit(1);
    }
}
main();
