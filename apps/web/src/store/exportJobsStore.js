"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExportJobsStore = void 0;
exports.createJobEntry = createJobEntry;
exports.resolveJobKey = resolveJobKey;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const exportUtils_1 = require("@/lib/exportUtils");
exports.useExportJobsStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    jobs: {},
    getJob: (key) => get().jobs[key],
    upsertJob: (key, job) => set((state) => ({
        jobs: {
            ...state.jobs,
            [key]: job,
        },
    })),
    updateStatus: (key, status, updates) => set((state) => {
        const existing = state.jobs[key];
        if (!existing)
            return state;
        return {
            jobs: {
                ...state.jobs,
                [key]: {
                    ...existing,
                    status,
                    updatedAt: new Date().toISOString(),
                    ...updates,
                },
            },
        };
    }),
    clearJob: (key) => set((state) => {
        const { [key]: _, ...rest } = state.jobs;
        return { jobs: rest };
    }),
}), {
    name: 'export-jobs',
    partialize: (state) => ({ jobs: state.jobs }),
}));
function createJobEntry(params) {
    const startedAt = params.startedAt || new Date().toISOString();
    return {
        jobId: params.jobId,
        tenantId: params.tenantId,
        caseId: params.caseId,
        paramsHash: params.paramsHash,
        idempotencyKey: params.idempotencyKey,
        status: 'creating',
        progress: 0,
        startedAt,
        updatedAt: startedAt,
    };
}
function resolveJobKey(tenantId, caseId, paramsHash) {
    return (0, exportUtils_1.buildExportKey)(tenantId, caseId, paramsHash);
}
