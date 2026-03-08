"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeToolLoadingEvidence = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const stableSortTools = (report) => ({
    ...report,
    tools: [...report.tools].sort((a, b) => `${a.serverName}:${a.toolName}`.localeCompare(`${b.serverName}:${b.toolName}`)),
});
const formatToolLine = (tool) => {
    const status = tool.decision.allowed ? 'allowed' : 'blocked';
    const waiver = tool.decision.waiverId ? ` (waiver ${tool.decision.waiverId})` : '';
    return `- ${tool.serverName}:${tool.toolName} → ${status}${waiver} · ${tool.tokenEstimate} tokens`;
};
const writeToolLoadingEvidence = async (options) => {
    const outputDir = options.outputDir ?? 'artifacts';
    const jsonPath = node_path_1.default.join(outputDir, 'tool-loading-report.json');
    const markdownPath = node_path_1.default.join(outputDir, 'tool-loading-report.md');
    const report = stableSortTools(options.report);
    await promises_1.default.mkdir(outputDir, { recursive: true });
    await promises_1.default.writeFile(jsonPath, JSON.stringify(report, null, 2));
    const lines = [
        `# Tool Loading Report`,
        ``,
        `**Skillpack:** ${report.skillpack.name}`,
        `**Shard:** ${report.shard.shard}`,
        `**Environment:** ${report.policy.environment}`,
        `**Generated:** ${report.generatedAt}`,
        ``,
        `## Reasons`,
        ...report.shard.reasons.map((reason) => `- ${reason}`),
        ``,
        `## Tools`,
        ...report.tools.map(formatToolLine),
        ``,
        `## Totals`,
        `- Tools considered: ${report.totals.toolsConsidered}`,
        `- Tools injected: ${report.totals.toolsInjected}`,
        `- Estimated tokens: ${report.totals.estimatedTokens}`,
        ``,
        `## Policy`,
        `- Break-glass used: ${report.policy.breakGlassUsed ? 'yes' : 'no'}`,
    ];
    await promises_1.default.writeFile(markdownPath, `${lines.join('\n')}\n`);
    return { jsonPath, markdownPath };
};
exports.writeToolLoadingEvidence = writeToolLoadingEvidence;
