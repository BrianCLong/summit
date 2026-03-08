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
function loadControls() {
    const controlPath = path.join(process.cwd(), 'docs/security/control-implementations.json');
    const data = fs.readFileSync(controlPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.controls;
}
function renderMarkdown(controls) {
    const lines = [];
    lines.push('# Control Automation Plan');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    lines.push('Source: docs/security/control-implementations.json');
    lines.push('');
    lines.push('Each control below is derived directly from threat mitigation strategies and can be executed by CI/ops runbooks.');
    lines.push('');
    for (const control of controls) {
        lines.push(`## ${control.id} — ${control.title}`);
        lines.push('');
        lines.push(`- **Threat Model:** [${control.threatModel}](${control.threatModel})`);
        lines.push(`- **Mitigation:** ${control.mitigation}`);
        lines.push(`- **Owner:** ${control.owner}`);
        lines.push('- **Automation:**');
        lines.push('');
        for (const step of control.automation) {
            lines.push(`  - \\`, $, { step }, ``);
        }
        lines.push('');
        lines.push('- **Evidence Sources:**');
        lines.push('');
        for (const evidence of control.evidence) {
            lines.push(`  - ${evidence}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
function writePlan(markdown) {
    const outputDir = path.join(process.cwd(), 'docs/security/generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'control-automation-plan.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
}
function main() {
    const controls = loadControls();
    const markdown = renderMarkdown(controls);
    writePlan(markdown);
    console.log('Generated control automation plan at docs/security/generated/control-automation-plan.md');
}
main();
