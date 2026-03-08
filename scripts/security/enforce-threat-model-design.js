#!/usr/bin/env ts-node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function parseArgs() {
    const args = process.argv.slice(2);
    let changedFiles = [];
    let format = 'text';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--changed-files' && args[i + 1]) {
            changedFiles = args[i + 1].split(',').map((f) => f.trim()).filter(Boolean);
            i++;
        }
        else if (args[i] === '--base-ref' && args[i + 1]) {
            const baseRef = args[i + 1];
            try {
                const diff = (0, child_process_1.execSync)(`git diff --name-only ${baseRef}...HEAD`, {
                    encoding: 'utf-8',
                });
                changedFiles = diff.split('\n').filter((f) => f.trim().length > 0);
            }
            catch (error) {
                console.error('Failed to compute diff for design enforcement:', error);
            }
            i++;
        }
        else if (args[i] === '--format' && args[i + 1]) {
            const value = args[i + 1].toLowerCase();
            if (value === 'markdown') {
                format = 'markdown';
            }
            i++;
        }
    }
    return { changedFiles, format };
}
function isDesignFile(file) {
    const patterns = [
        /^adr\/.+\.md$/,
        /^docs\/.*design.*\.md$/i,
        /^docs\/architecture\/.+\.md$/,
        /^docs\/arch\/.+\.md$/,
    ];
    return patterns.some((pattern) => pattern.test(file));
}
function hasThreatModelReference(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        return false;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const threatModelRegex = /threat model/i;
    const supplyChainRegex = /supply chain|third-party|insider/i;
    return threatModelRegex.test(content) && supplyChainRegex.test(content);
}
function formatOutput(violations, format) {
    if (violations.length === 0) {
        return format === 'markdown'
            ? '> **Status**: All design artifacts reference threat models.'
            : 'All design artifacts reference threat models.';
    }
    if (format === 'markdown') {
        const lines = ['## Threat Model Design Gate', '', '> **Status**: Action Required', ''];
        for (const violation of violations) {
            lines.push(`- ${violation}`);
        }
        lines.push('');
        lines.push('Run `npx ts-node scripts/security/enforce-threat-model-design.ts --changed-files <files>` to re-check.');
        return lines.join('\n');
    }
    return ['Threat model design enforcement failed:', ...violations].join('\n');
}
function main() {
    const { changedFiles, format } = parseArgs();
    if (changedFiles.length === 0) {
        console.log('No changed files specified. Use --changed-files or --base-ref');
        process.exit(0);
    }
    const designFiles = changedFiles.filter(isDesignFile);
    const violations = [];
    if (designFiles.length === 0) {
        console.log('No design/ADR artifacts detected.');
        process.exit(0);
    }
    if (!changedFiles.includes('docs/security/THREAT_MODEL_INDEX.md')) {
        violations.push('Update docs/security/THREAT_MODEL_INDEX.md when design artifacts change.');
    }
    for (const file of designFiles) {
        if (!hasThreatModelReference(file)) {
            violations.push(`${file}: add a threat model reference (SC/TP/IN coverage required).`);
        }
    }
    const output = formatOutput(violations, format);
    console.log(output);
    if (violations.length > 0) {
        process.exit(1);
    }
}
main();
