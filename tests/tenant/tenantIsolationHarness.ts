import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export type ProbeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export interface EndpointProbe {
  name: string;
  description?: string;
  method: ProbeHttpMethod;
  path: string;
  tenantHeader: string;
  responsePath: string;
  fixtureKey: keyof TenantFixture;
  expectedFilters: string[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  tenantId: string;
  scope: { tenant: string };
  tags: string[];
}

export interface GraphPath {
  pathId: string;
  start: string;
  end: string;
  hops: number;
  tenantId: string;
  riskScore: number;
  scope: { tenant: string };
}

export interface GraphNeighborhood {
  nodeId: string;
  neighbors: string[];
  tenantId: string;
  label: string;
  scope: { tenant: string };
}

export interface RagAnswer {
  answerId: string;
  question: string;
  answer: string;
  tenantId: string;
  citations: string[];
  scope: { tenant: string };
}

export interface ExportArtifact {
  exportId: string;
  artifactName: string;
  checksum: string;
  tenantId: string;
  scope: { tenant: string };
}

export interface AuditEvent {
  eventId: string;
  action: string;
  resourceId: string;
  tenantId: string;
  severity: 'info' | 'warn' | 'error';
  scope: { tenant: string };
}

export interface TenantFixture {
  tenantId: string;
  searchResults: SearchResult[];
  graphPaths: GraphPath[];
  graphNeighbors: GraphNeighborhood[];
  ragAnswers: RagAnswer[];
  exports: ExportArtifact[];
  auditEvents: AuditEvent[];
}

export interface ProbeRequest {
  headers: Record<string, string>;
  payload: Record<string, any>;
}

export interface ProbeResponse {
  status: number;
  body: Record<string, any>;
}

export interface ProbeExecution {
  request: ProbeRequest;
  response: ProbeResponse;
}

export interface IsolationLeak {
  probe: string;
  tenantUnderTest: string;
  offendingTenant: string;
  filterPath?: string;
  reason: 'cross-tenant-record' | 'missing-filter' | 'filter-mismatch';
  recordSample: any;
}

export interface ProbeRunResult {
  probe: EndpointProbe;
  tenantId: string;
  records: any[];
  leaks: IsolationLeak[];
  request: ProbeRequest;
}

export interface ProbeClient {
  execute(
    probe: EndpointProbe,
    tenantId: string,
    request: ProbeRequest,
  ): Promise<ProbeExecution>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function setPath(target: Record<string, any>, pathExpression: string, value: any): void {
  const parts = pathExpression.split('.');
  let cursor: Record<string, any> = target;

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

function getPath(source: any, pathExpression: string): any {
  return pathExpression.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, source);
}

function recordIdentifier(record: Record<string, any>): string {
  return (
    record.id ||
    record.pathId ||
    record.nodeId ||
    record.answerId ||
    record.exportId ||
    record.eventId ||
    record.resourceId ||
    JSON.stringify(record).slice(0, 120)
  );
}

export function loadProbeConfig(
  configPath: string = path.resolve(process.cwd(), 'tests/tenant/probes.yaml'),
): EndpointProbe[] {
  const raw = yaml.load(readFileSync(configPath, 'utf8')) as { probes?: EndpointProbe[] };

  if (!raw?.probes || !Array.isArray(raw.probes)) {
    throw new Error('Tenant isolation probe configuration is empty or malformed.');
  }

  return raw.probes;
}

export class FetchProbeClient implements ProbeClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async execute(
    probe: EndpointProbe,
    tenantId: string,
    request: ProbeRequest,
  ): Promise<ProbeExecution> {
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

export class MockProbeClient implements ProbeClient {
  private fixtures: Record<string, TenantFixture>;

  constructor(fixtures: TenantFixture[]) {
    this.fixtures = fixtures.reduce(
      (acc, fixture) => ({ ...acc, [fixture.tenantId]: fixture }),
      {},
    );
  }

  async execute(
    probe: EndpointProbe,
    tenantId: string,
    request: ProbeRequest,
  ): Promise<ProbeExecution> {
    const fixture = this.fixtures[tenantId];

    if (!fixture) {
      throw new Error(`No fixture found for tenant ${tenantId}`);
    }

    const dataset = deepClone(fixture[probe.fixtureKey]);
    const body: Record<string, any> = {
      meta: {
        probe: probe.name,
        tenant: tenantId,
        filtersApplied: {
          ...probe.expectedFilters.reduce(
            (acc, filter) => ({ ...acc, [filter]: tenantId }),
            {} as Record<string, string>,
          ),
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

export class TenantIsolationHarness {
  private probes: EndpointProbe[];
  private fixtures: TenantFixture[];
  private client: ProbeClient;
  private parallelism: number;

  constructor(options: {
    probes: EndpointProbe[];
    fixtures: TenantFixture[];
    client?: ProbeClient;
    parallelism?: number;
  }) {
    this.probes = options.probes;
    this.fixtures = options.fixtures;
    this.client =
      options.client ||
      new FetchProbeClient(process.env.TENANT_ISOLATION_BASE_URL || 'http://localhost:4000');
    this.parallelism = options.parallelism ?? 4;
  }

  async runSuite(): Promise<ProbeRunResult[]> {
    const tasks: Array<() => Promise<ProbeRunResult>> = [];

    for (const probe of this.probes) {
      for (const fixture of this.fixtures) {
        tasks.push(() => this.runProbeForTenant(probe, fixture));
      }
    }

    return this.runWithLimit(tasks, this.parallelism);
  }

  formatLeakReport(leaks: IsolationLeak[]): string {
    return leaks
      .map((leak) => {
        const record = JSON.stringify(leak.recordSample, null, 2);
        const filter = leak.filterPath ? ` filter "${leak.filterPath}"` : '';
        return `[${leak.probe}] tenant "${leak.tenantUnderTest}" saw data from "${leak.offendingTenant}" (${leak.reason}${filter}) -> ${record}`;
      })
      .join('\n');
  }

  private async runProbeForTenant(
    probe: EndpointProbe,
    fixture: TenantFixture,
  ): Promise<ProbeRunResult> {
    const payload = this.buildPayload(probe, fixture.tenantId);
    const request: ProbeRequest = {
      headers: {
        [probe.tenantHeader]: fixture.tenantId,
      },
      payload,
    };

    const execution = await this.client.execute(probe, fixture.tenantId, request);
    const records = this.extractRecords(execution.response.body, probe.responsePath);

    const leaks: IsolationLeak[] = [
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

  private buildPayload(probe: EndpointProbe, tenantId: string): Record<string, any> {
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

  private extractRecords(body: Record<string, any>, responsePath: string): any[] {
    const records = getPath(body, responsePath);
    if (!records) return [];
    if (Array.isArray(records)) return records;
    return [records];
  }

  private findCrossTenantRecords(
    probe: EndpointProbe,
    fixture: TenantFixture,
    records: any[],
  ): IsolationLeak[] {
    const otherRecords = this.fixtures
      .filter((candidate) => candidate.tenantId !== fixture.tenantId)
      .flatMap((candidate) => candidate[probe.fixtureKey])
      .map((record) => ({
        id: recordIdentifier(record),
        tenantId: record.tenantId ?? record.scope?.tenant ?? 'unknown',
      }));

    const otherIds = new Map<string, string>();
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
          } satisfies IsolationLeak;
        }

        return null;
      })
      .filter(Boolean) as IsolationLeak[];
  }

  private verifyFilters(
    probe: EndpointProbe,
    tenantId: string,
    payload: Record<string, any>,
    records: any[],
  ): IsolationLeak[] {
    const leaks: IsolationLeak[] = [];

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
        const matchesTenant =
          value === tenantId ||
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

  private async runWithLimit<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const p = Promise.resolve()
        .then(task)
        .then((result) => {
          results.push(result);
        });

      executing.push(
        p.then(() => {
          executing.splice(executing.indexOf(p as Promise<void>), 1);
        }) as Promise<void>,
      );

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }
}
