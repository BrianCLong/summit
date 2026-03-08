"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExportJobStatus = normalizeExportJobStatus;
exports.useCaseExportJob = useCaseExportJob;
const react_1 = require("react");
const export_1 = require("@/lib/api/export");
const exportUtils_1 = require("@/lib/exportUtils");
const exportJobsStore_1 = require("@/store/exportJobsStore");
const export_2 = require("@/telemetry/export");
function withJitter(base) {
    const jitter = base * 0.2 * Math.random();
    return Math.min(base + jitter, 10000);
}
function normalizeExportJobStatus(status, previous) {
    const downloadUrl = status.downloadUrl || previous?.downloadUrl;
    const progress = status.progress ?? previous?.progress ?? 0;
    const updatedAt = status.updatedAt || new Date().toISOString();
    const downloadReady = status.status === 'completed' && Boolean(downloadUrl);
    const isFailure = status.status === 'failed';
    const isCanceled = status.status === 'canceled';
    let lifecycle = 'in_progress';
    if (downloadReady) {
        lifecycle = 'ready';
    }
    else if (isFailure) {
        lifecycle = 'failed';
    }
    else if (isCanceled) {
        lifecycle = 'canceled';
    }
    const isTerminal = downloadReady || isFailure || isCanceled;
    return {
        lifecycle,
        isTerminal,
        progress,
        downloadUrl: downloadUrl || undefined,
        error: status.error,
        updatedAt,
    };
}
function useDurableCaseExportJob(args, paramsHash, jobKey) {
    const { tenantId, caseId, caseTitle, format } = args;
    const idempotencyKey = (0, react_1.useMemo)(() => (0, exportUtils_1.deriveIdempotencyKey)(tenantId, caseId, paramsHash), [tenantId, caseId, paramsHash]);
    const [error, setError] = (0, react_1.useState)(null);
    const pollingRef = (0, react_1.useRef)(null);
    const backoffRef = (0, react_1.useRef)(1500);
    const { jobs, getJob, upsertJob, updateStatus } = (0, exportJobsStore_1.useExportJobsStore)((state) => ({
        jobs: state.jobs,
        getJob: state.getJob,
        upsertJob: state.upsertJob,
        updateStatus: state.updateStatus,
    }));
    const activeJob = jobs[jobKey];
    const stopPolling = (0, react_1.useCallback)(() => {
        if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
        }
        backoffRef.current = 1500;
    }, []);
    const pollStatus = (0, react_1.useCallback)(async () => {
        const job = getJob(jobKey);
        if (!job) {
            stopPolling();
            return;
        }
        try {
            const status = await (0, export_1.fetchExportJob)(tenantId, caseId, job.jobId);
            const normalized = normalizeExportJobStatus(status, job);
            updateStatus(jobKey, normalized.lifecycle, {
                progress: normalized.progress,
                downloadUrl: normalized.downloadUrl,
                error: normalized.error,
                updatedAt: normalized.updatedAt,
            });
            if (normalized.isTerminal) {
                stopPolling();
                if (normalized.lifecycle === 'ready') {
                    (0, export_2.recordTelemetryEvent)('export_completed', job.jobId, job.startedAt);
                }
                return;
            }
            backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
            const delay = withJitter(backoffRef.current);
            pollingRef.current = setTimeout(() => {
                void pollStatus();
            }, delay);
        }
        catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Unable to fetch export status';
            setError(message);
            updateStatus(jobKey, 'failed', { error: message });
            (0, export_2.recordTelemetryEvent)('export_failed', job.jobId, job.startedAt);
            stopPolling();
        }
    }, [caseId, getJob, jobKey, stopPolling, tenantId, updateStatus]);
    const createJob = (0, react_1.useCallback)(async (customIdempotencyKey) => {
        try {
            setError(null);
            const response = await (0, export_1.createExportJob)({
                tenantId,
                caseId,
                format,
                options: args.options,
                paramsHash,
                idempotencyKey: customIdempotencyKey,
            });
            const jobEntry = (0, exportJobsStore_1.createJobEntry)({
                tenantId,
                caseId,
                paramsHash,
                jobId: response.id,
                idempotencyKey: customIdempotencyKey ?? idempotencyKey,
                startedAt: response.startedAt,
            });
            upsertJob(jobKey, jobEntry);
            (0, export_2.recordTelemetryEvent)('export_started', response.id, jobEntry.startedAt);
            await pollStatus();
            return jobEntry;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start export';
            setError(message);
            return null;
        }
    }, [args.options, caseId, format, idempotencyKey, jobKey, paramsHash, pollStatus, tenantId, upsertJob]);
    const startExport = (0, react_1.useCallback)(async () => {
        if (activeJob && !['failed', 'complete', 'canceled'].includes(activeJob.status)) {
            return activeJob;
        }
        return createJob();
    }, [activeJob, createJob]);
    const startNewExport = (0, react_1.useCallback)(async () => {
        const salt = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const freshKey = (0, exportUtils_1.deriveIdempotencyKey)(tenantId, caseId, paramsHash, salt);
        stopPolling();
        return createJob(freshKey);
    }, [caseId, createJob, paramsHash, stopPolling, tenantId]);
    const cancel = (0, react_1.useCallback)(async () => {
        const job = getJob(jobKey);
        if (!job)
            return;
        try {
            await (0, export_1.cancelExportJob)(tenantId, caseId, job.jobId);
        }
        finally {
            stopPolling();
            updateStatus(jobKey, 'canceled');
        }
    }, [caseId, getJob, jobKey, stopPolling, tenantId, updateStatus]);
    const markDownload = (0, react_1.useCallback)(async () => {
        const job = getJob(jobKey);
        if (!job || !job.downloadUrl)
            return;
        try {
            updateStatus(jobKey, 'downloading');
            await (0, export_1.triggerDownload)(job.downloadUrl, (0, exportUtils_1.sanitizeFilename)(caseTitle, format));
            updateStatus(jobKey, 'complete');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to download export';
            setError(message);
            updateStatus(jobKey, 'failed', { error: message });
        }
    }, [caseTitle, format, getJob, jobKey, updateStatus]);
    (0, react_1.useEffect)(() => {
        const job = getJob(jobKey);
        if (job && ['creating', 'in_progress', 'ready', 'downloading'].includes(job.status)) {
            pollStatus();
        }
    }, [getJob, jobKey, pollStatus]);
    (0, react_1.useEffect)(() => () => stopPolling(), [stopPolling]);
    return {
        job: activeJob,
        paramsHash,
        jobKey,
        error,
        startExport,
        startNewExport,
        cancel,
        markDownload,
        idempotencyKey: activeJob?.idempotencyKey ?? idempotencyKey,
    };
}
function useLegacyCaseExportJob(args, paramsHash, jobKey) {
    const { tenantId, caseId, caseTitle, format } = args;
    const idempotencyKey = (0, react_1.useMemo)(() => (0, exportUtils_1.deriveIdempotencyKey)(tenantId, caseId, paramsHash), [tenantId, caseId, paramsHash]);
    const [job, setJob] = (0, react_1.useState)(undefined);
    const [error, setError] = (0, react_1.useState)(null);
    const pollingRef = (0, react_1.useRef)(null);
    const backoffRef = (0, react_1.useRef)(1500);
    const stopPolling = (0, react_1.useCallback)(() => {
        if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
        }
        backoffRef.current = 1500;
    }, []);
    const pollStatus = (0, react_1.useCallback)(async () => {
        if (!job)
            return;
        try {
            const status = await (0, export_1.fetchExportJob)(tenantId, caseId, job.jobId);
            const normalized = normalizeExportJobStatus(status, job);
            setJob((previous) => previous
                ? {
                    ...previous,
                    status: normalized.lifecycle,
                    progress: normalized.progress,
                    downloadUrl: normalized.downloadUrl,
                    error: normalized.error,
                    updatedAt: normalized.updatedAt,
                }
                : previous);
            if (normalized.isTerminal) {
                stopPolling();
                if (normalized.lifecycle === 'ready') {
                    (0, export_2.recordTelemetryEvent)('export_completed', job.jobId, job.startedAt);
                }
                return;
            }
            backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
            const delay = withJitter(backoffRef.current);
            pollingRef.current = setTimeout(() => pollStatus(), delay);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to fetch export status';
            setError(message);
            setJob((previous) => (previous ? { ...previous, status: 'failed', error: message } : previous));
            (0, export_2.recordTelemetryEvent)('export_failed', job.jobId, job.startedAt);
            stopPolling();
        }
    }, [caseId, job, stopPolling, tenantId]);
    const createJob = (0, react_1.useCallback)(async (customIdempotencyKey) => {
        try {
            setError(null);
            const response = await (0, export_1.createExportJob)({
                tenantId,
                caseId,
                format,
                options: args.options,
                paramsHash,
                idempotencyKey: customIdempotencyKey,
            });
            const nextJob = (0, exportJobsStore_1.createJobEntry)({
                tenantId,
                caseId,
                paramsHash,
                jobId: response.id,
                idempotencyKey: customIdempotencyKey ?? idempotencyKey,
                startedAt: response.startedAt,
            });
            setJob(nextJob);
            (0, export_2.recordTelemetryEvent)('export_started', response.id, nextJob.startedAt);
            await pollStatus();
            return nextJob;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start export';
            setError(message);
            return null;
        }
    }, [args.options, caseId, format, idempotencyKey, paramsHash, pollStatus, tenantId]);
    const startExport = (0, react_1.useCallback)(async () => {
        if (job && !['failed', 'complete', 'canceled'].includes(job.status)) {
            return job;
        }
        return createJob();
    }, [createJob, job]);
    const startNewExport = (0, react_1.useCallback)(async () => {
        const salt = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const freshKey = (0, exportUtils_1.deriveIdempotencyKey)(tenantId, caseId, paramsHash, salt);
        stopPolling();
        return createJob(freshKey);
    }, [caseId, createJob, paramsHash, stopPolling, tenantId]);
    const cancel = (0, react_1.useCallback)(async () => {
        if (!job)
            return;
        try {
            await (0, export_1.cancelExportJob)(tenantId, caseId, job.jobId);
        }
        finally {
            stopPolling();
            setJob((previous) => (previous ? { ...previous, status: 'canceled' } : previous));
        }
    }, [caseId, job, stopPolling, tenantId]);
    const markDownload = (0, react_1.useCallback)(async () => {
        if (!job || !job.downloadUrl)
            return;
        try {
            setJob((previous) => (previous ? { ...previous, status: 'downloading' } : previous));
            await (0, export_1.triggerDownload)(job.downloadUrl, (0, exportUtils_1.sanitizeFilename)(caseTitle, format));
            setJob((previous) => (previous ? { ...previous, status: 'complete' } : previous));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to download export';
            setError(message);
            setJob((previous) => (previous ? { ...previous, status: 'failed', error: message } : previous));
        }
    }, [caseTitle, format, job]);
    (0, react_1.useEffect)(() => () => stopPolling(), [stopPolling]);
    return {
        job,
        paramsHash,
        jobKey,
        error,
        startExport,
        startNewExport,
        cancel,
        markDownload,
        idempotencyKey: job?.idempotencyKey ?? idempotencyKey,
    };
}
function useCaseExportJob(args) {
    const paramsHash = (0, react_1.useMemo)(() => (0, exportUtils_1.computeExportParamsHash)({
        tenantId: args.tenantId,
        caseId: args.caseId,
        format: args.format,
        options: args.options,
    }), [args.caseId, args.format, args.options, args.tenantId]);
    const jobKey = (0, react_1.useMemo)(() => (0, exportUtils_1.resolveJobKey)(args.tenantId, args.caseId, paramsHash), [args.caseId, args.tenantId, paramsHash]);
    const mode = args.mode ?? 'durable';
    if (mode === 'legacy') {
        return useLegacyCaseExportJob(args, paramsHash, jobKey);
    }
    return useDurableCaseExportJob(args, paramsHash, jobKey);
}
