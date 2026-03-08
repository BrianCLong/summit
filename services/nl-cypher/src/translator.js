"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = translate;
const schema_js_1 = require("./schema.js");
const sanitizer_js_1 = require("./sanitizer.js");
const validator_js_1 = require("./validator.js");
function tokenize(prompt) {
    return prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}
function selectLabel(tokens, schema) {
    const match = schema.nodes.find((node) => tokens.some((token) => token === node.label.toLowerCase()));
    return match ? match.label : schema.nodes[0]?.label ?? 'Entity';
}
function collectProperties(tokens, label, schema) {
    const node = schema.nodes.find((n) => n.label === label);
    if (!node)
        return [];
    return node.properties.filter((prop) => tokens.includes(prop.toLowerCase()));
}
function buildWhereClause(label, properties) {
    if (properties.length === 0)
        return '';
    const clauses = properties.map((prop, index) => `n.${prop} CONTAINS $p${index}`);
    return `WHERE ${clauses.join(' AND ')}`;
}
function buildCypher(prompt, schema, trace) {
    const tokens = tokenize(prompt);
    trace.push(`tokens: ${tokens.join(',')}`);
    const targetLabel = selectLabel(tokens, schema);
    trace.push(`targetLabel: ${targetLabel}`);
    const properties = collectProperties(tokens, targetLabel, schema);
    trace.push(`properties: ${properties.join(',') || 'none'}`);
    const where = buildWhereClause(targetLabel, properties);
    const cypher = [`MATCH (n:${targetLabel})`, where, 'RETURN n', 'LIMIT 25']
        .filter(Boolean)
        .join('\n');
    const sql = `SELECT * FROM ${targetLabel.toLowerCase()}${properties.length ? ' WHERE ' + properties.map((p, idx) => `${p} LIKE :p${idx}`).join(' AND ') : ''} LIMIT 25`;
    const confidence = Math.min(0.95, 0.55 + properties.length * 0.1 + (where ? 0.05 : 0));
    const warnings = [];
    const blocked = (0, sanitizer_js_1.isBlocked)(cypher);
    if (blocked.blocked) {
        warnings.push(...blocked.reasons);
    }
    const { valid, warnings: validationWarnings } = (0, validator_js_1.validateCypher)(cypher);
    warnings.push(...validationWarnings);
    if (!valid) {
        trace.push('validator flagged query; lowering confidence');
        return {
            cypher,
            sqlFallback: sql,
            confidence: Math.min(confidence, 0.5),
            warnings,
            reasoningTrace: trace,
        };
    }
    return { cypher, sqlFallback: sql, confidence, warnings, reasoningTrace: trace };
}
function translate(prompt) {
    const trace = [`prompt: ${prompt}`];
    const { schema, source } = (0, schema_js_1.loadSchema)();
    trace.push(`schemaSource: ${source}`);
    const normalized = (0, schema_js_1.normalizeSchema)(schema);
    const result = buildCypher(prompt, normalized, trace);
    return result;
}
