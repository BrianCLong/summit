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
exports.visibilityGap = visibilityGap;
exports.computeNarrativeShare = computeNarrativeShare;
exports.generateReport = generateReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function visibilityGap(connectivity, localEvidenceCount) {
    return connectivity !== "normal" && localEvidenceCount < 3;
}
function computeNarrativeShare(claims, narrativeId) {
    const total = claims.length || 1;
    return claims.filter(c => c.narrativeIds?.includes(narrativeId)).length / total;
}
function generateReport(datasetPath, outputDir) {
    const data = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const narratives = data.narratives;
    const claims = data.claims;
    const connectivity = data.connectivity;
    // Create metrics
    const metrics = {
        narrativeShares: narratives.map(n => ({
            id: n.id,
            share: computeNarrativeShare(claims, n.id)
        })),
        totalClaims: claims.length
    };
    // Create report
    const isGap = connectivity.some(c => visibilityGap(c.state, claims.length));
    const report = {
        topNarratives: narratives.map(n => n.id),
        visibilityGap: isGap,
        evidenceReferences: claims.map(c => c.evidenceIds).flat()
    };
    // Deterministic Stamp
    const stamp = {
        schemaVersion: "1.0",
        mode: "deterministic"
    };
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
    fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
    // Generate Brief Markdown
    const brief = `# Narrative SITREP: Iran War

## Visibility Gap
${isGap ? "WARNING: High visibility gap due to throttled or shutdown connectivity." : "Normal visibility."}

## Top Narratives
${narratives.map(n => `- **${n.canonicalLabel}** (Share: ${metrics.narrativeShares.find(s => s.id === n.id)?.share})`).join('\n')}

## Evidence Used
${report.evidenceReferences.join(', ')}
`;
    fs.writeFileSync(path.join(outputDir, 'brief.md'), brief);
}
