import { DriftFinding, Selector } from '../types.js';

export function generatePlan(findings: DriftFinding[], selector: Selector): { cypher: string[]; sql: string[] } {
    const cypher: string[] = [];
    const sql: string[] = [];

    for (const f of findings) {
        if (f.kind === 'MISSING_NODE') {
            const props = f.data ? formatProps(f.data, selector) : `{${selector.pk.asId}: '${f.id}'}`;
            cypher.push(`CREATE (n:${selector.label} ${props});`);
        } else if (f.kind === 'ORPHAN_NODE') {
            cypher.push(`MATCH (n:${selector.label} {${selector.pk.asId}: '${f.id}'}) DETACH DELETE n;`);
        } else if (f.kind === 'PROP_MISMATCH') {
            const val = formatVal(f.expected);
            cypher.push(`MATCH (n:${selector.label} {${selector.pk.asId}: '${f.id}'}) SET n.${f.prop} = ${val};`);
        }
    }

    return { cypher, sql };
}

function formatProps(data: any, selector: Selector): string {
    const parts = [];
    const pkVal = formatVal(data[selector.pk.column]);
    parts.push(`${selector.pk.asId}: ${pkVal}`);

    for(const p of selector.properties) {
        const val = formatVal(data[p.column]);
        parts.push(`${p.prop}: ${val}`);
    }
    return `{${parts.join(', ')}}`;
}

function formatVal(val: any): string {
    if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (val === null || val === undefined) return 'null';
    return String(val);
}
