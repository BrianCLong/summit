"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantIsolationHarness = exports.MockProbeClient = exports.FetchProbeClient = void 0;
exports.loadProbeConfig = loadProbeConfig;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
function setPath(target, pathExpression, value) {
    const parts = pathExpression.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        if (isLeaf) {
            cursor[part] = value;
            return;
        }
        if (!cursor[part] || typeof cursor[part] !== 'object') {
            cursor[part] = {};
        }
        cursor = cursor[part];
    }
}
function getPath(source, pathExpression) {
    return pathExpression.split('.').reduce((acc, key) => {
        if (acc === undefined || acc === null)
            return undefined;
        return acc[key];
    }, source);
}
function recordIdentifier(record) {
    return (record.id ||
        record.pathId ||
        record.nodeId ||
        record.answerId ||
        record.exportId ||
        record.eventId ||
        record.resourceId ||
        JSON.stringify(record).slice(0, 120));
}
function loadProbeConfig(configPath = node_path_1.default.resolve(process.cwd(), 'tests/tenant/probes.yaml')) {
    const raw = js_yaml_1.default.load((0, node_fs_1.readFileSync)(configPath, 'utf8'));
    if (!raw?.probes || !Array.isArray(raw.probes)) {
        throw new Error('Tenant isolation probe configuration is empty or malformed.');
    }
    return raw.probes;
}
class FetchProbeClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async execute(probe, tenantId, request) {
        const url = `${this.baseUrl}${probe.path}`;
        const response = await fetch(url, {
            method: probe.method,
            headers: {
                'content-type': 'application/json',
                ...request.headers,
                [probe.tenantHeader]: tenantId,
            },
            body: probe.method === 'GET' ? undefined : JSON.stringify(request.payload),
        });
        const body = await response.json().catch(() => ({}));
        return {
            request: {
                ...request,
                headers: {
                    ...request.headers,
                    [probe.tenantHeader]: tenantId,
                },
            },
            response: {
                status: response.status,
                body,
            },
        };
    }
}
exports.FetchProbeClient = FetchProbeClient;
class MockProbeClient {
    fixtures;
    constructor(fixtures) {
        this.fixtures = fixtures.reduce((acc, fixture) => ({ ...acc, [fixture.tenantId]: fixture }), {});
    }
    async execute(probe, tenantId, request) {
        const fixture = this.fixtures[tenantId];
        if (!fixture) {
            throw new Error(`No fixture found for tenant ${tenantId}`);
        }
        const dataset = deepClone(fixture[probe.fixtureKey]);
        const body = {
            meta: {
                probe: probe.name,
                tenant: tenantId,
                filtersApplied: {
                    ...probe.expectedFilters.reduce((acc, filter) => ({ ...acc, [filter]: tenantId }), {}),
                },
            },
        };
        setPath(body, probe.responsePath, dataset);
        return {
            request,
            response: {
                status: 200,
                body,
            },
        };
    }
}
exports.MockProbeClient = MockProbeClient;
class TenantIsolationHarness {
    probes;
    fixtures;
    client;
    parallelism;
    constructor(options) {
        this.probes = options.probes;
        this.fixtures = options.fixtures;
        this.client =
            options.client ||
                new FetchProbeClient(process.env.TENANT_ISOLATION_BASE_URL || 'http://localhost:4000');
        this.parallelism = options.parallelism ?? 4;
    }
    async runSuite() {
        const tasks = [];
        for (const probe of this.probes) {
            for (const fixture of this.fixtures) {
                tasks.push(() => this.runProbeForTenant(probe, fixture));
            }
        }
        return this.runWithLimit(tasks, this.parallelism);
    }
    formatLeakReport(leaks) {
        return leaks
            .map((leak) => {
            const record = JSON.stringify(leak.recordSample, null, 2);
            const filter = leak.filterPath ? ` filter "${leak.filterPath}"` : '';
            return `[${leak.probe}] tenant "${leak.tenantUnderTest}" saw data from "${leak.offendingTenant}" (${leak.reason}${filter}) -> ${record}`;
        })
            .join('\n');
    }
    async runProbeForTenant(probe, fixture) {
        const payload = this.buildPayload(probe, fixture.tenantId);
        const request = {
            headers: {
                [probe.tenantHeader]: fixture.tenantId,
            },
            payload,
        };
        const execution = await this.client.execute(probe, fixture.tenantId, request);
        const records = this.extractRecords(execution.response.body, probe.responsePath);
        const leaks = [
            ...this.findCrossTenantRecords(probe, fixture, records),
            ...this.verifyFilters(probe, fixture.tenantId, payload, records),
        ];
        return {
            probe,
            tenantId: fixture.tenantId,
            records,
            leaks,
            request,
        };
    }
    buildPayload(probe, tenantId) {
        const payload = deepClone(probe.payload ?? {});
        for (const filterPath of probe.expectedFilters) {
            const existing = getPath(payload, filterPath);
            if (existing === undefined) {
                setPath(payload, filterPath, tenantId);
            }
        }
        if (!getPath(payload, 'tenantId')) {
            setPath(payload, 'tenantId', tenantId);
        }
        return payload;
    }
    extractRecords(body, responsePath) {
        const records = getPath(body, responsePath);
        if (!records)
            return [];
        if (Array.isArray(records))
            return records;
        return [records];
    }
    findCrossTenantRecords(probe, fixture, records) {
        const otherRecords = this.fixtures
            .filter((candidate) => candidate.tenantId !== fixture.tenantId)
            .flatMap((candidate) => candidate[probe.fixtureKey])
            .map((record) => ({
            id: recordIdentifier(record),
            tenantId: record.tenantId ?? record.scope?.tenant ?? 'unknown',
        }));
        const otherIds = new Map();
        otherRecords.forEach((record) => otherIds.set(record.id, record.tenantId));
        return records
            .map((record) => {
            const recordTenant = record.tenantId ?? record.scope?.tenant;
            const recordId = recordIdentifier(record);
            const offendingTenant = recordTenant || otherIds.get(recordId);
            if (offendingTenant && offendingTenant !== fixture.tenantId) {
                return {
                    probe: probe.name,
                    tenantUnderTest: fixture.tenantId,
                    offendingTenant,
                    reason: 'cross-tenant-record',
                    recordSample: record,
                };
            }
            return null;
        })
            .filter(Boolean);
    }
    verifyFilters(probe, tenantId, payload, records) {
        const leaks = [];
        for (const filterPath of probe.expectedFilters) {
            const payloadValue = getPath(payload, filterPath);
            const recordValues = records.map((record) => getPath(record, filterPath));
            const values = [payloadValue, ...recordValues].filter((value) => value !== undefined);
            if (!values.length) {
                leaks.push({
                    probe: probe.name,
                    tenantUnderTest: tenantId,
                    offendingTenant: 'unknown',
                    filterPath,
                    reason: 'missing-filter',
                    recordSample: { payload },
                });
                continue;
            }
            for (const value of values) {
                const matchesTenant = value === tenantId ||
                    (Array.isArray(value) && value.includes(tenantId)) ||
                    value?.tenant === tenantId;
                if (!matchesTenant) {
                    leaks.push({
                        probe: probe.name,
                        tenantUnderTest: tenantId,
                        offendingTenant: value,
                        filterPath,
                        reason: 'filter-mismatch',
                        recordSample: { payload, sample: records[0] },
                    });
                }
            }
        }
        return leaks;
    }
    async runWithLimit(tasks, limit) {
        const results = [];
        const executing = [];
        for (const task of tasks) {
            const p = Promise.resolve()
                .then(task)
                .then((result) => {
                results.push(result);
            });
            executing.push(p.then(() => {
                executing.splice(executing.indexOf(p), 1);
            }));
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
        await Promise.all(executing);
        return results;
    }
}
exports.TenantIsolationHarness = TenantIsolationHarness;
