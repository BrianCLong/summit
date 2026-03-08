"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.InfluxConnector = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
function encodeTags(tags) {
    if (!tags || !Object.keys(tags).length) {
        return '';
    }
    return Object.entries(tags)
        .map(([key, value]) => `${key}=${value.replace(/ /g, '\\ ')}`)
        .join(',');
}
function encodeFields(fields) {
    return Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
}
function toLineProtocol(point) {
    const tagPart = encodeTags(point.tags);
    const measurement = tagPart ? `${point.measurement},${tagPart}` : point.measurement;
    const fields = encodeFields(point.fields);
    const nanos = point.timestamp.getTime() * 1_000_000;
    return `${measurement} ${fields} ${nanos}`;
}
function toFluxFilter(tags) {
    if (!tags)
        return '';
    return Object.entries(tags)
        .map(([key, value]) => `  |> filter(fn: (r: any) => r["${key}"] == "${value}")`)
        .join('\n');
}
function fluxAggregation(aggregation) {
    const fnMap = {
        avg: 'mean',
        sum: 'sum',
        min: 'min',
        max: 'max',
        median: 'median',
        p95: 'quantile(q: 0.95)',
        p99: 'quantile(q: 0.99)',
    };
    return `  |> aggregateWindow(every: ${aggregation.every}, fn: ${fnMap[aggregation.function]}, createEmpty: false)`;
}
function parseFluxCsv(csv) {
    const lines = csv.split('\n').filter((line) => line && !line.startsWith('#'));
    const rows = [];
    for (const line of lines) {
        const columns = line.split(',');
        const timeIdx = columns.findIndex((value) => value === '_time');
        const valueIdx = columns.findIndex((value) => value === '_value');
        if (timeIdx === -1 || valueIdx === -1)
            continue;
        const timestamp = new Date(columns[timeIdx]);
        const value = Number(columns[valueIdx]);
        rows.push({ timestamp, values: { value } });
    }
    return rows;
}
class InfluxConnector {
    config;
    constructor(config) {
        this.config = config;
    }
    async writePoints(points) {
        if (!points.length)
            return;
        const payload = points.map(toLineProtocol).join('\n');
        const url = new URL('/api/v2/write', this.config.url);
        url.searchParams.set('org', this.config.org);
        url.searchParams.set('bucket', this.config.bucket);
        const res = await (0, node_fetch_1.default)(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Token ${this.config.token}`,
                'Content-Type': 'text/plain',
            },
            body: payload,
        });
        if (!res.ok) {
            const message = await res.text();
            throw new Error(`Failed to write points to InfluxDB: ${res.status} ${message}`);
        }
    }
    async queryRange(params) {
        const flux = this.buildFluxQuery(params);
        const res = await this.executeQuery(flux);
        const text = await res.text();
        return parseFluxCsv(text);
    }
    async aggregate(params) {
        const flux = this.buildFluxQuery(params, params.window);
        const res = await this.executeQuery(flux);
        const text = await res.text();
        return parseFluxCsv(text);
    }
    buildFluxQuery(params, aggregation) {
        const fields = params.fields?.length ? params.fields : ['*'];
        const fluxFields = fields.map((field) => `  |> filter(fn: (r: any) => r._field == "${field}")`).join('\n');
        const filters = toFluxFilter(params.tags);
        const window = aggregation ? `${fluxAggregation(aggregation)}\n` : '';
        return [
            `from(bucket: "${this.config.bucket}")`,
            `  |> range(start: ${params.start.toISOString()}, stop: ${params.end.toISOString()})`,
            `  |> filter(fn: (r: any) => r._measurement == "${params.measurement}")`,
            fluxFields,
            filters,
            window,
            '  |> yield(name: "results")',
        ]
            .filter(Boolean)
            .join('\n');
    }
    async executeQuery(flux) {
        const url = new URL('/api/v2/query', this.config.url);
        url.searchParams.set('org', this.config.org);
        const res = await (0, node_fetch_1.default)(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Token ${this.config.token}`,
                'Content-Type': 'application/vnd.flux',
            },
            body: flux,
        });
        if (!res.ok) {
            const message = await res.text();
            throw new Error(`Influx query failed: ${res.status} ${message}`);
        }
        return res;
    }
}
exports.InfluxConnector = InfluxConnector;
exports.__private__ = {
    toLineProtocol,
    toFluxFilter,
    fluxAggregation,
    parseFluxCsv,
};
