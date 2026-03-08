#!/usr/bin/env tsx
"use strict";
// @ts-nocheck
/**
 * Promise Tracker - Extraction Module
 *
 * Scans the codebase for:
 * 1. TODO/FIXME/XXX/HACK comments in code
 * 2. Backlog sections in markdown docs
 * 3. "should", "must", "need to", "eventually" patterns in docs
 * 4. Feature flags that haven't been fully rolled out
 * 5. Half-implemented modules (v1, beta, experimental)
 */
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
exports.extractPromises = extractPromises;
const glob_1 = require("glob");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const gray_matter_1 = __importDefault(require("gray-matter"));
// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
    rootDir: process.cwd(),
    excludePaths: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/archive/**',
        '**/.archive/**',
        '**/vendor/**',
        '**/*.min.js',
        '**/*.bundle.js',
    ],
    codePatterns: {
        todo: /(?:\/\/|#|\/\*|\*|<!--)\s*(TODO|FIXME|XXX|HACK|BUG|OPTIMIZE|REFACTOR|REVIEW)[\s:]+(.+?)(?:\*\/|-->|$)/gi,
        issueRef: /#(\d+)/g,
    },
    docPatterns: {
        backlogSection: /^#{1,3}\s*(?:Backlog|TODO|Tasks|Action Items|Next Steps|Roadmap)/im,
        commitmentPhrases: [
            /\b(?:we\s+)?(?:should|must|need\s+to|have\s+to)\s+(.+?)(?:\.|$)/gi,
            /\b(?:eventually|later|future|next\s+sprint|upcoming)\s+(.+?)(?:\.|$)/gi,
            /\b(?:TODO|FIXME|WIP)[\s:]+(.+?)(?:\.|$)/gi,
            /\[\s*\]\s+(.+?)(?:\n|$)/g, // Unchecked checkboxes
        ],
    },
    componentKeywords: new Map([
        ['maestro', 'Maestro'],
        ['conductor', 'Conductor'],
        ['switchboard', 'Switchboard'],
        ['companyos', 'CompanyOS'],
        ['intelgraph', 'IntelGraph'],
        ['copilot', 'Copilot'],
        ['graph-api', 'GraphAPI'],
        ['graphql', 'GraphAPI'],
        ['analytics', 'Analytics'],
        ['auth', 'Auth'],
        ['ci', 'CI/CD'],
        ['cd', 'CI/CD'],
        ['observability', 'Observability'],
        ['prometheus', 'Observability'],
        ['grafana', 'Observability'],
        ['terraform', 'Infrastructure'],
        ['k8s', 'Infrastructure'],
        ['kubernetes', 'Infrastructure'],
        ['helm', 'Infrastructure'],
        ['security', 'Security'],
        ['testing', 'Testing'],
        ['test', 'Testing'],
        ['doc', 'Documentation'],
        ['readme', 'Documentation'],
        ['data', 'Data'],
        ['ui', 'UI/UX'],
        ['frontend', 'UI/UX'],
        ['client', 'UI/UX'],
    ]),
};
// =============================================================================
// Utility Functions
// =============================================================================
function inferComponent(text, filePath) {
    const combined = `${text} ${filePath}`.toLowerCase();
    for (const [keyword, component] of CONFIG.componentKeywords) {
        if (combined.includes(keyword)) {
            return component;
        }
    }
    // Infer from path
    if (filePath.includes('/server/'))
        return 'Summit';
    if (filePath.includes('/client/'))
        return 'UI/UX';
    if (filePath.includes('/services/'))
        return 'Summit';
    if (filePath.includes('/packages/'))
        return 'Summit';
    if (filePath.includes('/docs/'))
        return 'Documentation';
    if (filePath.includes('/infra/') || filePath.includes('/terraform/'))
        return 'Infrastructure';
    return 'Other';
}
function inferScopeClass(text) {
    const lower = text.toLowerCase();
    if (lower.includes('simple') || lower.includes('quick') || lower.includes('trivial')) {
        return 'tiny';
    }
    if (lower.includes('refactor') || lower.includes('rewrite') || lower.includes('overhaul')) {
        return 'large';
    }
    if (lower.includes('system') || lower.includes('architecture') || lower.includes('redesign')) {
        return 'epic';
    }
    if (lower.includes('add') || lower.includes('implement') || lower.includes('create')) {
        return 'medium';
    }
    if (lower.includes('fix') || lower.includes('update') || lower.includes('change')) {
        return 'small';
    }
    return 'medium';
}
function inferConfidence(type) {
    if (['FIXME', 'BUG', 'HACK'].includes(type.toUpperCase())) {
        return 'high'; // Clearly identified issues
    }
    if (['TODO', 'OPTIMIZE'].includes(type.toUpperCase())) {
        return 'medium';
    }
    return 'low';
}
// =============================================================================
// Code Scanner
// =============================================================================
async function scanCodeFiles() {
    const matches = [];
    const codeFiles = await (0, glob_1.glob)('**/*.{ts,tsx,js,jsx,py,sh,go,rs,java}', {
        cwd: CONFIG.rootDir,
        ignore: CONFIG.excludePaths,
    });
    for (const file of codeFiles) {
        try {
            const content = await (0, promises_1.readFile)((0, path_1.join)(CONFIG.rootDir, file), 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                let match;
                const todoRegex = new RegExp(CONFIG.codePatterns.todo.source, 'gi');
                while ((match = todoRegex.exec(line)) !== null) {
                    const [, type, todoContent] = match;
                    if (todoContent && todoContent.trim().length > 3) {
                        matches.push({
                            type: type.toUpperCase(),
                            content: todoContent.trim(),
                            file,
                            line: index + 1,
                        });
                    }
                }
            });
        }
        catch {
            // Skip files that can't be read
        }
    }
    return matches;
}
// =============================================================================
// Documentation Scanner
// =============================================================================
async function scanDocFiles() {
    const matches = [];
    const docFiles = await (0, glob_1.glob)('**/*.md', {
        cwd: CONFIG.rootDir,
        ignore: CONFIG.excludePaths,
    });
    for (const file of docFiles) {
        try {
            const content = await (0, promises_1.readFile)((0, path_1.join)(CONFIG.rootDir, file), 'utf-8');
            const { content: docContent } = (0, gray_matter_1.default)(content);
            // Look for backlog sections
            if (CONFIG.docPatterns.backlogSection.test(docContent)) {
                // Extract items from backlog section
                const sections = docContent.split(/^#{1,3}\s+/m);
                for (const section of sections) {
                    if (/^(?:Backlog|TODO|Tasks|Action Items|Next Steps|Roadmap)/i.test(section)) {
                        // Extract list items
                        const listItems = section.match(/^[-*]\s+(.+)$/gm) || [];
                        for (const item of listItems) {
                            const cleanItem = item.replace(/^[-*]\s+/, '').trim();
                            if (cleanItem.length > 5 && !cleanItem.startsWith('[x]')) {
                                matches.push({
                                    content: cleanItem,
                                    file,
                                    context: 'backlog_section',
                                });
                            }
                        }
                    }
                }
            }
            // Look for commitment phrases
            for (const pattern of CONFIG.docPatterns.commitmentPhrases) {
                let match;
                const regex = new RegExp(pattern.source, 'gi');
                while ((match = regex.exec(docContent)) !== null) {
                    const commitment = match[1]?.trim();
                    if (commitment && commitment.length > 10 && commitment.length < 300) {
                        matches.push({
                            content: commitment,
                            file,
                            context: 'commitment_phrase',
                        });
                    }
                }
            }
            // Look for unchecked checkboxes
            const uncheckedBoxes = docContent.match(/\[\s*\]\s+(.+?)(?:\n|$)/g) || [];
            for (const box of uncheckedBoxes) {
                const item = box.replace(/\[\s*\]\s+/, '').trim();
                if (item.length > 5) {
                    matches.push({
                        content: item,
                        file,
                        context: 'unchecked_checkbox',
                    });
                }
            }
        }
        catch {
            // Skip files that can't be read
        }
    }
    return matches;
}
// =============================================================================
// Conversion to Staging Items
// =============================================================================
function codeMatchToStagingItem(match) {
    return {
        raw_source: `${match.file}:${match.line}`,
        rough_title: `[${match.type}] ${match.content.slice(0, 100)}`,
        notes: match.content,
        confidence: inferConfidence(match.type),
        scope_class: inferScopeClass(match.content),
        component: inferComponent(match.content, match.file),
        suggested_type: match.type === 'BUG' ? 'bug' : match.type === 'HACK' ? 'tech_debt' : 'feature',
        captured_at: new Date().toISOString(),
        processed: false,
    };
}
function docMatchToStagingItem(match) {
    return {
        raw_source: match.file,
        rough_title: match.content.slice(0, 100),
        notes: match.content,
        confidence: match.context === 'backlog_section' ? 'high' : 'medium',
        scope_class: inferScopeClass(match.content),
        component: inferComponent(match.content, match.file),
        suggested_type: 'feature',
        captured_at: new Date().toISOString(),
        processed: false,
    };
}
// =============================================================================
// Main Extraction Function
// =============================================================================
async function extractPromises() {
    console.log('Starting promise extraction...\n');
    // Scan code files
    console.log('Scanning code files for TODOs/FIXMEs...');
    const codeMatches = await scanCodeFiles();
    console.log(`  Found ${codeMatches.length} code comments\n`);
    // Scan documentation
    console.log('Scanning documentation for commitments...');
    const docMatches = await scanDocFiles();
    console.log(`  Found ${docMatches.length} documentation items\n`);
    // Convert to staging items
    const staging = [
        ...codeMatches.map(codeMatchToStagingItem),
        ...docMatches.map(docMatchToStagingItem),
    ];
    // Deduplicate by similar content
    const seen = new Set();
    const dedupedStaging = staging.filter((item) => {
        const key = item.notes.toLowerCase().slice(0, 50);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    const stats = {
        filesScanned: codeMatches.length + docMatches.length,
        codeFilesScanned: codeMatches.length,
        docFilesScanned: docMatches.length,
        todosFound: codeMatches.length,
        commitmentsFound: docMatches.filter((m) => m.context === 'commitment_phrase').length,
        checklistItemsFound: docMatches.filter((m) => m.context === 'unchecked_checkbox').length,
    };
    return { staging: dedupedStaging, stats };
}
// =============================================================================
// CLI Entry Point
// =============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
    extractPromises()
        .then(({ staging, stats }) => {
        console.log('\n=== Extraction Complete ===\n');
        console.log(`Total staging items: ${staging.length}`);
        console.log(`  - From code TODOs: ${stats.todosFound}`);
        console.log(`  - From commitments: ${stats.commitmentsFound}`);
        console.log(`  - From checklists: ${stats.checklistItemsFound}`);
        // Group by component
        const byComponent = staging.reduce((acc, item) => {
            const comp = item.component || 'Other';
            acc[comp] = (acc[comp] || 0) + 1;
            return acc;
        }, {});
        console.log('\nBy Component:');
        Object.entries(byComponent)
            .sort((a, b) => b[1] - a[1])
            .forEach(([comp, count]) => {
            console.log(`  ${comp}: ${count}`);
        });
        // Output to file
        const outputPath = (0, path_1.join)(CONFIG.rootDir, '.promise-tracker', 'staging.json');
        Promise.resolve().then(() => __importStar(require('fs'))).then(({ mkdirSync, writeFileSync }) => {
            mkdirSync((0, path_1.join)(CONFIG.rootDir, '.promise-tracker'), { recursive: true });
            writeFileSync(outputPath, JSON.stringify({ staging, stats }, null, 2));
            console.log(`\nStaging data written to: ${outputPath}`);
        });
    })
        .catch(console.error);
}
exports.default = extractPromises;
