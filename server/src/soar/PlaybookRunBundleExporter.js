"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybookRunBundleExporter = void 0;
const stream_1 = require("stream");
const archiver_1 = __importDefault(require("archiver"));
const playbookRunManifest_js_1 = require("../provenance/playbookRunManifest.js");
class PlaybookRunBundleExporter {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    async buildBundleEntries(tenantId, runId) {
        const run = await this.fetchRun(runId, tenantId);
        if (!run) {
            throw new Error('Playbook run not found');
        }
        const playbook = await this.fetchPlaybook(run.playbookId, tenantId);
        if (!playbook) {
            throw new Error('Playbook not found');
        }
        const manifest = this.buildManifest(run, playbook);
        playbookRunManifest_js_1.playbookRunManifestSchema.parse(manifest);
        const logPayload = {
            runId: run.id,
            playbookId: run.playbookId,
            status: run.status,
            startedAt: run.startedAt?.toISOString() ?? null,
            completedAt: run.completedAt?.toISOString() ?? null,
            error: run.error ?? null,
            steps: run.stepsState ?? [],
        };
        const outputPayload = {
            context: run.context ?? {},
            result: run.result ?? null,
            steps: (run.stepsState ?? []).map((step) => ({
                stepId: step.stepId,
                output: step.output ?? null,
                error: step.error ?? null,
            })),
        };
        const entries = [
            {
                name: 'run-log.json',
                data: JSON.stringify(logPayload, null, 2),
            },
            {
                name: 'outputs.json',
                data: JSON.stringify(outputPayload, null, 2),
            },
            {
                name: 'provenance-manifest.json',
                data: JSON.stringify(manifest, null, 2),
            },
        ];
        return { entries, manifest };
    }
    async createBundle(tenantId, runId) {
        const { entries } = await this.buildBundleEntries(tenantId, runId);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const stream = new stream_1.PassThrough();
        const bufferPromise = new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
            archive.on('error', reject);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        archive.pipe(stream);
        entries.forEach((entry) => {
            archive.append(entry.data, { name: entry.name });
        });
        await archive.finalize();
        const buffer = await bufferPromise;
        const filename = `playbook-run-${runId}.zip`;
        return { filename, buffer };
    }
    buildManifest(run, playbook) {
        const { nodes, edges } = this.buildProvenance(run, playbook);
        return {
            schemaVersion: '1.0',
            generatedAt: new Date().toISOString(),
            run: {
                id: run.id,
                playbookId: run.playbookId,
                tenantId: run.tenantId,
                status: run.status,
                startedAt: run.startedAt?.toISOString() ?? null,
                completedAt: run.completedAt?.toISOString() ?? null,
            },
            playbook: {
                id: playbook.id,
                name: playbook.name,
                description: playbook.description ?? null,
            },
            provenance: {
                nodes,
                edges,
            },
        };
    }
    buildProvenance(run, playbook) {
        const nodes = [];
        const edges = [];
        const runNodeId = `playbook-run:${run.id}`;
        nodes.push({
            id: runNodeId,
            tenantId: run.tenantId,
            nodeType: 'Action',
            subType: 'PlaybookRun',
            label: `Playbook Run ${run.id}`,
            timestamp: run.startedAt?.toISOString() ?? new Date().toISOString(),
            metadata: {
                playbookId: run.playbookId,
                status: run.status,
            },
        });
        const stepsState = run.stepsState ?? [];
        const stepIds = stepsState.map((step) => step.stepId);
        const stepIndex = new Map(stepIds.map((stepId, index) => [stepId, index]));
        const stepMap = new Map(playbook.workflow.steps.map((step) => [step.id, step]));
        stepsState.forEach((stepState) => {
            const step = stepMap.get(stepState.stepId);
            const stepNodeId = `playbook-step:${stepState.stepId}`;
            const timestamp = stepState.startedAt?.toISOString() ??
                run.startedAt?.toISOString() ??
                new Date().toISOString();
            nodes.push({
                id: stepNodeId,
                tenantId: run.tenantId,
                nodeType: 'Action',
                subType: 'PlaybookStep',
                label: step?.name ?? stepState.stepId,
                timestamp,
                metadata: {
                    stepId: stepState.stepId,
                    stepType: step?.type ?? 'unknown',
                    status: stepState.status,
                },
            });
            edges.push({
                sourceId: runNodeId,
                targetId: stepNodeId,
                relation: 'TRIGGERED',
                timestamp,
                properties: {
                    order: stepIndex.get(stepState.stepId),
                },
            });
        });
        this.addStepLineageEdges(edges, stepsState);
        return { nodes, edges };
    }
    addStepLineageEdges(edges, stepsState) {
        for (let i = 0; i < stepsState.length - 1; i += 1) {
            const current = stepsState[i];
            const next = stepsState[i + 1];
            const timestamp = next.startedAt?.toISOString() ??
                current.completedAt?.toISOString() ??
                new Date().toISOString();
            edges.push({
                sourceId: `playbook-step:${current.stepId}`,
                targetId: `playbook-step:${next.stepId}`,
                relation: 'DERIVED_FROM',
                timestamp,
                properties: {
                    lineage: 'step-order',
                },
            });
        }
    }
    async fetchRun(runId, tenantId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.playbook_runs WHERE id = $1 AND tenant_id = $2`, [runId, tenantId]);
        if (!rows[0]) {
            return null;
        }
        return this.mapRun(rows[0]);
    }
    async fetchPlaybook(playbookId, tenantId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.playbooks WHERE id = $1 AND tenant_id = $2`, [playbookId, tenantId]);
        if (!rows[0]) {
            return null;
        }
        return this.mapPlaybook(rows[0]);
    }
    mapRun(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            playbookId: row.playbook_id,
            caseId: row.case_id,
            status: row.status,
            context: this.parseJson(row.context) ?? {},
            stepsState: this.parseJson(row.steps_state) ?? [],
            result: this.parseJson(row.result),
            startedAt: row.started_at,
            completedAt: row.completed_at,
            error: row.error,
            triggeredBy: row.triggered_by,
        };
    }
    mapPlaybook(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            workflow: this.parseJson(row.workflow) ?? { steps: [], startStepId: '' },
            triggers: this.parseJson(row.triggers) ?? [],
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            metadata: this.parseJson(row.metadata) ?? {},
        };
    }
    parseJson(value) {
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        return value;
    }
}
exports.PlaybookRunBundleExporter = PlaybookRunBundleExporter;
