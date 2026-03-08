"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCsvToGraph = mapCsvToGraph;
exports.enforceCap = enforceCap;
const papaparse_1 = __importDefault(require("papaparse"));
async function mapCsvToGraph(csvText, mapping) {
    return new Promise((resolve, reject) => {
        papaparse_1.default.parse(csvText, {
            header: true,
            complete: (results) => {
                const rows = results.data;
                const out = {
                    entities: [],
                    edges: [],
                    lineage: [],
                };
                rows.forEach((r, i) => {
                    // Skip empty rows
                    if (Object.keys(r).length === 0)
                        return;
                    // Skip rows missing key column
                    if (!r[mapping.keyCol])
                        return;
                    const e = {
                        type: mapping.entityType,
                        key: `${mapping.keyPrefix}:${r[mapping.keyCol]}`,
                        props: {},
                    };
                    mapping.propMap.forEach((m) => {
                        if (r[m.from])
                            e.props[m.to] = r[m.from];
                    });
                    out.entities.push(e);
                    if (mapping.edgeFrom &&
                        mapping.edgeTo &&
                        mapping.edgeType &&
                        r[mapping.edgeFrom.col] &&
                        r[mapping.edgeTo.col]) {
                        out.edges.push({
                            type: mapping.edgeType,
                            from: `${mapping.edgeFrom.prefix}:${r[mapping.edgeFrom.col]}`,
                            to: `${mapping.edgeTo.prefix}:${r[mapping.edgeTo.col]}`,
                            props: { source: 'csv-import' },
                        });
                    }
                    out.lineage.push({
                        row: i,
                        source: 'csv',
                        mappingVersion: mapping.version,
                    });
                });
                resolve(out);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}
// Plan over-cap UX (server guard)
function enforceCap(ctx, metric, value) {
    const cap = ctx.plan?.caps?.[metric];
    if (cap) {
        if (cap.hard && value > cap.hard) {
            throw new Error(`Plan cap reached for ${metric}. Contact support to increase.`);
        }
        if (cap.soft && value > cap.soft) {
            return {
                warning: true,
                message: `Approaching ${metric} cap (${value}/${cap.hard}).`,
            };
        }
    }
    return { warning: false };
}
