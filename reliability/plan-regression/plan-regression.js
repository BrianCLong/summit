"use strict";
/// <reference types="node" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BASELINE_PATH = void 0;
exports.hashSql = hashSql;
exports.normalizePlanNode = normalizePlanNode;
exports.collectPlanSignature = collectPlanSignature;
exports.comparePlanSignatures = comparePlanSignatures;
exports.formatPlanDiffs = formatPlanDiffs;
exports.loadBaseline = loadBaseline;
exports.runExplain = runExplain;
exports.checkPlansAgainstBaseline = checkPlansAgainstBaseline;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const critical_queries_1 = require("./critical-queries");
const ESTIMATE_TOLERANCE = 0.25; // 25% drift allowed before we flag it
exports.DEFAULT_BASELINE_PATH = node_path_1.default.join(process.cwd(), 'reliability', 'plan-regression', 'fixtures', 'postgres-plan-baseline.json');
function hashSql(sql) {
    return (0, node_crypto_1.createHash)('sha1')
        .update(sql.replace(/\s+/g, ' ').trim())
        .digest('hex');
}
function normalizePlanNode(plan) {
    const node = {
        nodeType: plan['Node Type'] ?? 'Unknown',
        relationName: plan['Relation Name'],
        indexName: plan['Index Name'],
        joinType: plan['Join Type'],
        estimatedRows: plan['Plan Rows'] ?? plan['Actual Rows'],
        filter: plan['Filter'],
    };
    const children = plan['Plans']?.map(normalizePlanNode);
    if (children && children.length > 0) {
        node.children = children;
    }
    return node;
}
function collectPlanSignature(planPayload) {
    const root = planPayload?.[0]?.Plan ?? planPayload?.[0];
    if (!root) {
        throw new Error('EXPLAIN payload missing Plan root node');
    }
    return normalizePlanNode(root);
}
function formatPath(node, parentPath) {
    const relationSuffix = node.relationName ? `:${node.relationName}` : '';
    const pathSegment = `${node.nodeType}${relationSuffix}`;
    return parentPath ? `${parentPath} > ${pathSegment}` : pathSegment;
}
function comparePlanSignatures(baseline, current, parentPath = '', diffs = []) {
    const pathLabel = formatPath(current, parentPath);
    const comparableFields = [
        'nodeType',
        'relationName',
        'indexName',
        'joinType',
    ];
    for (const field of comparableFields) {
        if (baseline[field] !== current[field]) {
            diffs.push({
                path: pathLabel,
                field,
                baseline: baseline[field],
                current: current[field],
                message: `${field} changed`,
            });
        }
    }
    if (typeof baseline.estimatedRows === 'number' &&
        typeof current.estimatedRows === 'number') {
        const delta = Math.abs(current.estimatedRows - baseline.estimatedRows) /
            Math.max(baseline.estimatedRows, 1);
        if (delta > ESTIMATE_TOLERANCE) {
            diffs.push({
                path: pathLabel,
                field: 'estimatedRows',
                baseline: baseline.estimatedRows,
                current: current.estimatedRows,
                message: `estimatedRows drifted by ${(delta * 100).toFixed(1)}%`,
            });
        }
    }
    const baselineChildren = baseline.children ?? [];
    const currentChildren = current.children ?? [];
    if (baselineChildren.length !== currentChildren.length) {
        diffs.push({
            path: pathLabel,
            field: 'children',
            baseline: baselineChildren.length,
            current: currentChildren.length,
            message: 'child plan count changed',
        });
    }
    const maxChildren = Math.min(baselineChildren.length, currentChildren.length);
    for (let i = 0; i < maxChildren; i += 1) {
        const baselineChild = baselineChildren[i];
        const currentChild = currentChildren[i];
        if (baselineChild && currentChild) {
            comparePlanSignatures(baselineChild, currentChild, pathLabel, diffs);
        }
    }
    return diffs;
}
function formatPlanDiffs(queryId, sql, diffs) {
    if (diffs.length === 0) {
        return '';
    }
    const header = `Plan regression detected for "${queryId}"`;
    const body = diffs
        .map((d) => `- ${d.path} :: ${d.field} — ${d.message} (baseline: ${String(d.baseline ?? '∅')}, current: ${String(d.current ?? '∅')})`)
        .join('\n');
    return `${header}\nSQL: ${sql.trim()}\n${body}`;
}
function loadBaseline(baselinePath = exports.DEFAULT_BASELINE_PATH) {
    const raw = (0, node_fs_1.readFileSync)(baselinePath, 'utf8');
    return JSON.parse(raw);
}
async function runExplain(pool, sql, analyze = false) {
    const explainPrefix = analyze
        ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)'
        : 'EXPLAIN (FORMAT JSON)';
    const { rows } = await pool.query(`${explainPrefix} ${sql}`);
    const planPayload = rows?.[0]?.['QUERY PLAN'];
    if (!planPayload) {
        throw new Error('EXPLAIN returned no plan payload');
    }
    return collectPlanSignature(planPayload);
}
async function checkPlansAgainstBaseline(options) {
    const baseline = loadBaseline(options.baselinePath ?? exports.DEFAULT_BASELINE_PATH);
    const baselineById = new Map();
    baseline.queries.forEach((entry) => baselineById.set(entry.id, entry));
    const results = [];
    for (const query of critical_queries_1.criticalQueries) {
        const baselineEntry = baselineById.get(query.id);
        const diffs = [];
        if (!baselineEntry) {
            results.push({
                queryId: query.id,
                differences: [
                    {
                        path: query.id,
                        field: 'baseline',
                        message: 'Missing baseline entry for query',
                    },
                ],
            });
            continue;
        }
        const currentSqlHash = hashSql(query.sql);
        if (baselineEntry.sqlHash && baselineEntry.sqlHash !== currentSqlHash) {
            diffs.push({
                path: query.id,
                field: 'sqlHash',
                baseline: baselineEntry.sqlHash,
                current: currentSqlHash,
                message: 'SQL text changed; refresh baseline required',
            });
        }
        const signature = await runExplain(options.pool, query.sql, options.analyze ?? baseline.analyze);
        if (baselineEntry.signature) {
            comparePlanSignatures(baselineEntry.signature, signature, '', diffs);
        }
        results.push({
            queryId: query.id,
            differences: diffs,
            signature,
        });
    }
    return results;
}
