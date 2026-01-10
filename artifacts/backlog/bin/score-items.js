import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { load as loadYaml } from 'js-yaml';
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
function loadWeights(filePath) {
    const contents = fs.readFileSync(filePath, 'utf-8');
    const parsed = loadYaml(contents);
    validateWeights(parsed);
    return parsed;
}
function loadItems(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) {
        const raw = fs.readFileSync(itemPath, 'utf-8');
        return [JSON.parse(raw)];
    }
    const files = fs
        .readdirSync(itemPath)
        .filter((file) => file.endsWith('.json'))
        .sort()
        .map((file) => path.join(itemPath, file));
    return files.map((file) => JSON.parse(fs.readFileSync(file, 'utf-8')));
}
function validateWeights(weights) {
    const required = [
        'risk_reduction',
        'debt_severity',
        'debt_age',
        'governance',
        'blast_radius',
        'urgency',
        'effort_penalty',
        'alignment',
    ];
    const missing = required.filter((key) => typeof weights.weights?.[key] !== 'number');
    if (missing.length > 0) {
        throw new Error(`Weights missing required keys: ${missing.join(', ')}`);
    }
    const outOfRange = required.filter((key) => {
        const value = weights.weights[key];
        return value < 0 || value > 1;
    });
    if (outOfRange.length > 0) {
        throw new Error(`Weights must be between 0 and 1: ${outOfRange.join(', ')}`);
    }
    if (weights.bands.p0 < weights.bands.p1 ||
        weights.bands.p1 < weights.bands.p2 ||
        weights.bands.p2 < 0 ||
        weights.bands.p0 > 1) {
        throw new Error('Priority band thresholds must satisfy 1 >= p0 >= p1 >= p2 >= 0');
    }
}
function validateItems(items, schemaPath) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const failures = items
        .map((item) => ({ item, valid: validate(item), errors: validate.errors }))
        .filter((entry) => !entry.valid);
    if (failures.length > 0) {
        const details = failures
            .map((entry) => `${entry.item.item_id ?? '<unknown>'}: ${ajv.errorsText(entry.errors)}`)
            .join('\n');
        throw new Error(`Backlog items failed schema validation:\n${details}`);
    }
}
function bandFromScore(score, bands) {
    if (score >= bands.p0)
        return 'P0';
    if (score >= bands.p1)
        return 'P1';
    if (score >= bands.p2)
        return 'P2';
    return 'P3';
}
function scoreItem(item, weights) {
    const w = weights.weights;
    const riskReduction = clamp(item.estimated_risk_reduction) * w.risk_reduction;
    const debtSeverity = clamp((item.metadata?.debt_severity ?? 0) / 5) * w.debt_severity;
    const debtAge = clamp(Math.min(item.metadata?.debt_age_days ?? 0, 365) / 365) * w.debt_age;
    const governance = clamp((item.metadata?.governance_impact ?? 0) / 5) * w.governance;
    const blastRadius = clamp((item.metadata?.blast_radius ?? 0) / 5) * w.blast_radius;
    const urgency = clamp(item.urgency.time_criticality) * w.urgency;
    const alignment = clamp(((item.metadata?.strategic_alignment?.length ?? 0) / 3)) * w.alignment;
    const effortPenalty = clamp(item.estimated_effort / 5) * w.effort_penalty;
    const priorityScore = clamp(riskReduction +
        debtSeverity +
        debtAge +
        governance +
        blastRadius +
        urgency +
        alignment -
        effortPenalty);
    const rationale = `Risk reduction ${riskReduction.toFixed(2)}, debt ${debtSeverity.toFixed(2)} + age ${debtAge.toFixed(2)}, ` +
        `governance ${governance.toFixed(2)}, blast ${blastRadius.toFixed(2)}, urgency ${urgency.toFixed(2)}, ` +
        `alignment ${alignment.toFixed(2)}, effort penalty ${effortPenalty.toFixed(2)}.`;
    return {
        ...item,
        priority_score: parseFloat(priorityScore.toFixed(3)),
        priority_band: bandFromScore(priorityScore, weights.bands),
        rationale,
    };
}
function summarize(items) {
    const totals = items.reduce((acc, item) => {
        acc.items += 1;
        acc.effort += item.estimated_effort;
        acc.risk_reduction += item.estimated_risk_reduction;
        acc.scores.push(item.priority_score);
        acc.categories[item.category] = (acc.categories[item.category] ?? 0) + 1;
        acc.bands[item.priority_band] = (acc.bands[item.priority_band] ?? 0) + 1;
        return acc;
    }, {
        items: 0,
        effort: 0,
        risk_reduction: 0,
        scores: [],
        categories: {},
        bands: {},
    });
    const averageScore = totals.scores.length
        ? totals.scores.reduce((a, b) => a + b, 0) / totals.scores.length
        : 0;
    return {
        totals: {
            items: totals.items,
            estimated_effort: parseFloat(totals.effort.toFixed(2)),
            estimated_risk_reduction: parseFloat(totals.risk_reduction.toFixed(2)),
            average_score: parseFloat(averageScore.toFixed(3)),
        },
        categories: totals.categories,
        bands: totals.bands,
    };
}
async function main() {
    const itemPath = process.argv.includes('--items')
        ? process.argv[process.argv.indexOf('--items') + 1]
        : 'backlog/examples';
    const weightsPath = process.argv.includes('--weights')
        ? process.argv[process.argv.indexOf('--weights') + 1]
        : 'backlog/weights.yaml';
    const schemaPath = process.argv.includes('--schema')
        ? process.argv[process.argv.indexOf('--schema') + 1]
        : 'backlog/item.schema.json';
    const snapshotPath = process.argv.includes('--out')
        ? process.argv[process.argv.indexOf('--out') + 1]
        : 'artifacts/backlog/backlog-snapshot.json';
    const metricsPath = process.argv.includes('--metrics')
        ? process.argv[process.argv.indexOf('--metrics') + 1]
        : 'artifacts/backlog/backlog-metrics.json';
    const weights = loadWeights(weightsPath);
    const items = loadItems(itemPath);
    validateItems(items, schemaPath);
    const scored = items.map((item) => scoreItem(item, weights));
    const snapshot = {
        generated_at: new Date().toISOString(),
        weights_version: weights.version,
        items: scored,
    };
    const metrics = {
        generated_at: snapshot.generated_at,
        weights_version: weights.version,
        summary: summarize(scored),
    };
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(`Snapshot written to ${snapshotPath}`);
    console.log(`Metrics written to ${metricsPath}`);
}
void main();
