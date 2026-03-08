"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCompatibilityMatrix = buildCompatibilityMatrix;
exports.assessRisk = assessRisk;
function getTableColumns(schema, tableName) {
    const table = schema.tables.find((t) => t.name === tableName);
    if (!table)
        return [];
    return table.columns.map((c) => c.name);
}
function evaluateChange(schema, telemetry, change) {
    const impacted = [];
    const tableColumns = getTableColumns(schema, change.table);
    const relevantUsages = telemetry.usages.filter((usage) => usage.table === change.table);
    for (const usage of relevantUsages) {
        const reasons = [];
        const affectedColumns = [];
        let status = 'compatible';
        if (change.type === 'rename') {
            const usesColumn = usage.columns.includes(change.from);
            if (usesColumn) {
                status = 'needs-migration';
                reasons.push(`Column ${change.from} renamed to ${change.to}`);
                affectedColumns.push(change.from);
            }
        }
        if (change.type === 'split') {
            const usesColumn = usage.columns.includes(change.column);
            if (usesColumn) {
                status = 'breaking';
                reasons.push(`Column ${change.column} split into ${change.into.map((c) => c.name).join(', ')}`);
                affectedColumns.push(change.column);
            }
        }
        if (change.type === 'widen') {
            const usesColumn = usage.columns.includes(change.column);
            if (usesColumn) {
                status = 'compatible';
                reasons.push(`Column ${change.column} widened to ${change.newType}`);
                affectedColumns.push(change.column);
            }
        }
        if (!tableColumns.includes(change.type === 'rename' ? change.from : change.column)) {
            reasons.push('Change references missing column');
            status = 'breaking';
        }
        if (reasons.length > 0) {
            impacted.push({
                consumer: usage.consumer,
                table: usage.table,
                status,
                reasons,
                affectedColumns,
            });
        }
    }
    return { change, impactedConsumers: impacted };
}
function buildCompatibilityMatrix(schema, telemetry, changes) {
    const impacts = [];
    for (const change of changes) {
        const result = evaluateChange(schema, telemetry, change);
        impacts.push(...result.impactedConsumers);
    }
    // Deduplicate consumer impacts by keeping highest severity per consumer-table
    const deduped = new Map();
    for (const impact of impacts) {
        const key = `${impact.consumer}:${impact.table}`;
        const existing = deduped.get(key);
        if (!existing) {
            deduped.set(key, impact);
            continue;
        }
        const severityOrder = ['compatible', 'needs-migration', 'breaking'];
        if (severityOrder.indexOf(impact.status) > severityOrder.indexOf(existing.status)) {
            deduped.set(key, {
                ...impact,
                reasons: Array.from(new Set([...existing.reasons, ...impact.reasons])),
                affectedColumns: Array.from(new Set([...existing.affectedColumns, ...impact.affectedColumns])),
            });
        }
    }
    return { impacts: Array.from(deduped.values()) };
}
function scoreForImpact(impact, telemetry) {
    const usage = telemetry.usages.find((entry) => entry.consumer === impact.consumer && entry.table === impact.table);
    const baseFrequency = usage?.frequency ?? 0;
    const severityMultiplier = impact.status === 'breaking' ? 1 : impact.status === 'needs-migration' ? 0.6 : 0.2;
    return baseFrequency * severityMultiplier;
}
function assessRisk(matrix, telemetry, changes) {
    const changeNotes = changes.map((change) => {
        if (change.type === 'rename')
            return `Rename ${change.table}.${change.from} -> ${change.to}`;
        if (change.type === 'split')
            return `Split ${change.table}.${change.column} into ${change.into.map((c) => c.name).join(', ')}`;
        return `Widen ${change.table}.${change.column} to ${change.newType}`;
    });
    const rawScore = matrix.impacts.reduce((acc, impact) => acc + scoreForImpact(impact, telemetry), 0);
    const normalized = Number((rawScore / Math.max(telemetry.windowDays, 1)).toFixed(2));
    let severity = 'low';
    if (normalized > 25)
        severity = 'high';
    else if (normalized > 10)
        severity = 'medium';
    return {
        score: normalized,
        severity,
        notes: [...changeNotes, `Aggregate normalized impact score: ${normalized}`],
    };
}
