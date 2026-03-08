"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distillToolSchema = exports.summarizeParams = exports.estimateTokenFootprint = void 0;
const TOKEN_DIVISOR = 4;
const stringifyForEstimate = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const estimateTokenFootprint = (value) => {
    const serialized = stringifyForEstimate(value);
    return Math.max(1, Math.ceil(serialized.length / TOKEN_DIVISOR));
};
exports.estimateTokenFootprint = estimateTokenFootprint;
const summarizeParams = (schema) => {
    if (!schema?.properties) {
        return [];
    }
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties).map(([name, details]) => {
        const type = details.type ?? 'unknown';
        const requiredFlag = required.has(name) ? 'required' : 'optional';
        const description = details.description ? ` - ${details.description}` : '';
        return `${name}: ${type} (${requiredFlag})${description}`;
    });
};
exports.summarizeParams = summarizeParams;
const distillToolSchema = (tool, safetyNotes, source) => {
    const params = (0, exports.summarizeParams)(tool.inputSchema);
    const summary = tool.description?.trim() || 'No description provided.';
    const tokenEstimate = (0, exports.estimateTokenFootprint)({ name: tool.name, summary, params });
    return {
        name: tool.name,
        summary,
        params,
        safetyNotes,
        tokenEstimate,
        source,
    };
};
exports.distillToolSchema = distillToolSchema;
