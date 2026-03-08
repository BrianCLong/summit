"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRiskReport = writeRiskReport;
exports.writeDashboard = writeDashboard;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function writeRiskReport(outputPath, registry, risks, diff) {
    const lines = [];
    lines.push('# Capability Risk Report');
    lines.push('');
    lines.push(`Total capabilities: ${registry.capabilities.length}`);
    lines.push('');
    if (diff) {
        lines.push('## What changed');
        lines.push('');
        lines.push(`- New capabilities: ${diff.new_capabilities.length}`);
        for (const cap of diff.new_capabilities) {
            lines.push(`  - ${cap}`);
        }
        lines.push(`- Removed capabilities: ${diff.removed_capabilities.length}`);
        for (const cap of diff.removed_capabilities) {
            lines.push(`  - ${cap}`);
        }
        lines.push(`- Scope changes: ${diff.scope_changes.length}`);
        for (const change of diff.scope_changes) {
            lines.push(`  - ${change}`);
        }
        lines.push('');
    }
    lines.push('## Risk ranking');
    lines.push('');
    const sorted = [...risks].sort((a, b) => b.score - a.score);
    for (const risk of sorted) {
        lines.push(`- ${risk.capability_id} (score: ${risk.score})`);
        lines.push(`  - Downstream services: ${risk.blast_radius.downstream_services}`);
        if (risk.missing_metadata.length) {
            lines.push(`  - Missing metadata: ${risk.missing_metadata.join(', ')}`);
        }
    }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outputPath), { recursive: true });
    node_fs_1.default.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}
function writeDashboard(outputPath, risks) {
    const lines = [];
    lines.push('# Capability Fabric Dashboard');
    lines.push('');
    lines.push('| Capability | Score | Downstream | Missing metadata |');
    lines.push('| --- | --- | --- | --- |');
    for (const risk of risks.sort((a, b) => b.score - a.score)) {
        lines.push(`| ${risk.capability_id} | ${risk.score} | ${risk.blast_radius.downstream_services} | ${risk.missing_metadata.join(', ') || 'none'} |`);
    }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outputPath), { recursive: true });
    node_fs_1.default.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}
