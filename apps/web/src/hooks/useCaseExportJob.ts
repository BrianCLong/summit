import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cancelExportJob, createExportJob, fetchExportJob, triggerDownload } from '@/lib/api/export'
import {
  computeExportParamsHash,
  deriveIdempotencyKey,
  resolveJobKey,
  sanitizeFilename,
} from '@/lib/exportUtils'
import { useExportJobsStore, createJobEntry } from '@/store/exportJobsStore'
import type {
  ExportFormat,
  ExportJobLifecycle,
  ExportJobState,
  ExportOptions,
  ExportJobStatusResponse,
} from '@/types/export'
import { recordTelemetryEvent } from '@/telemetry/export'

type UseCaseExportMode = 'durable' | 'legacy'

interface UseCaseExportJobArgs {
  tenantId: string
  caseId: string
  caseTitle: string
  format: ExportFormat
  options: ExportOptions
  mode?: UseCaseExportMode
}

interface ExportJobController {
  job?: ExportJobState
  paramsHash: string
  jobKey: string
  error: string | null
  startExport: () => Promise<ExportJobState | null>
  startNewExport: () => Promise<ExportJobState | null>
  cancel: () => Promise<void>
  markDownload: () => Promise<void>
  idempotencyKey: string
}

interface NormalizedStatus {
  lifecycle: ExportJobLifecycle
  isTerminal: boolean
  progress: number
  downloadUrl?: string
  error?: string
  updatedAt: string
}

function withJitter(base: number): number {
  const jitter = base * 0.2 * Math.random()
  return Math.min(base + jitter, 10000)
}

export function normalizeExportJobStatus(
  status: ExportJobStatusResponse,
  previous?: ExportJobState
): NormalizedStatus {
  const downloadUrl = status.downloadUrl || previous?.downloadUrl
  const progress = status.progress ?? previous?.progress ?? 0
  const updatedAt = status.updatedAt || new Date().toISOString()
  const downloadReady = status.status === 'completed' && Boolean(downloadUrl)
  const isFailure = status.status === 'failed'
  const isCanceled = status.status === 'canceled'

  let lifecycle: ExportJobLifecycle = 'in_progress'
  if (downloadReady) {
    lifecycle = 'ready'
  } else if (isFailure) {
    lifecycle = 'failed'
  } else if (isCanceled) {
    lifecycle = 'canceled'
  }

  const isTerminal = downloadReady || isFailure || isCanceled

  return {
    lifecycle,
    isTerminal,
    progress,
    downloadUrl: downloadUrl || undefined,
    error: status.error,
    updatedAt,
  }
}

function useDurableCaseExportJob(args: UseCaseExportJobArgs, paramsHash: string, jobKey: string) {
  const { tenantId, caseId, caseTitle, format } = args
  const idempotencyKey = useMemo(() => deriveIdempotencyKey(tenantId, caseId, paramsHash), [tenantId, caseId, paramsHash])
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const backoffRef = useRef(1500)
  const { jobs, getJob, upsertJob, updateStatus } = useExportJobsStore((state) => ({
    jobs: state.jobs,
    getJob: state.getJob,
    upsertJob: state.upsertJob,
    updateStatus: state.updateStatus,
  }))
  const activeJob = jobs[jobKey]

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    backoffRef.current = 1500
  }, [])

  const pollStatus = useCallback(async () => {
    const job = getJob(jobKey)
    if (!job) {
      stopPolling()
      return
    }

    try {
      const status = await fetchExportJob(tenantId, caseId, job.jobId)
      const normalized = normalizeExportJobStatus(status, job)

      updateStatus(jobKey, normalized.lifecycle, {
        progress: normalized.progress,
        downloadUrl: normalized.downloadUrl,
        error: normalized.error,
        updatedAt: normalized.updatedAt,
      })

      if (normalized.isTerminal) {
        stopPolling()
        if (normalized.lifecycle === 'ready') {
          recordTelemetryEvent('export_completed', job.jobId, job.startedAt)
        }
        return
      }

      backoffRef.current = Math.min(backoffRef.current * 1.5, 10000)
      const delay = withJitter(backoffRef.current)
      pollingRef.current = setTimeout(() => {
        void pollStatus()
      }, delay)
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Unable to fetch export status'
      setError(message)
      updateStatus(jobKey, 'failed', { error: message })
      recordTelemetryEvent('export_failed', job.jobId, job.startedAt)
      stopPolling()
    }
  }, [caseId, getJob, jobKey, stopPolling, tenantId, updateStatus])

  const createJob = useCallback(
    async (customIdempotencyKey?: string) => {
      try {
        setError(null)
        const response = await createExportJob({
          tenantId,
          caseId,
          format,
          options: args.options,
          paramsHash,
          idempotencyKey: customIdempotencyKey,
        })

        const jobEntry = createJobEntry({
          tenantId,
          caseId,
          paramsHash,
          jobId: response.id,
          idempotencyKey: customIdempotencyKey ?? idempotencyKey,
          startedAt: response.startedAt,
        })

        upsertJob(jobKey, jobEntry)
        recordTelemetryEvent('export_started', response.id, jobEntry.startedAt)
        await pollStatus()
        return jobEntry
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start export'
        setError(message)
        return null
      }
    },
    [args.options, caseId, format, idempotencyKey, jobKey, paramsHash, pollStatus, tenantId, upsertJob]
  )

  const startExport = useCallback(async () => {
    if (activeJob && !['failed', 'complete', 'canceled'].includes(activeJob.status)) {
      return activeJob
    }

    return createJob()
  }, [activeJob, createJob])

  const startNewExport = useCallback(async () => {
    const salt = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const freshKey = deriveIdempotencyKey(tenantId, caseId, paramsHash, salt)
    stopPolling()
    return createJob(freshKey)
  }, [caseId, createJob, paramsHash, stopPolling, tenantId])

  const cancel = useCallback(async () => {
    const job = getJob(jobKey)
    if (!job) return
    try {
      await cancelExportJob(tenantId, caseId, job.jobId)
    } finally {
      stopPolling()
      updateStatus(jobKey, 'canceled')
      recordTelemetryEvent('export_canceled', job.jobId, job.startedAt)
    }
  }, [caseId, getJob, jobKey, stopPolling, tenantId, updateStatus])

  const markDownload = useCallback(async () => {
    const job = getJob(jobKey)
    if (!job || !job.downloadUrl) return
    try {
      updateStatus(jobKey, 'downloading')
      await triggerDownload(job.downloadUrl, sanitizeFilename(caseTitle, format))
      updateStatus(jobKey, 'complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download export'
      setError(message)
      updateStatus(jobKey, 'failed', { error: message })
    }
  }, [caseTitle, format, getJob, jobKey, updateStatus])

  useEffect(() => {
    const job = getJob(jobKey)
    if (job && ['creating', 'in_progress', 'ready', 'downloading'].includes(job.status)) {
      pollStatus()
    }
  }, [getJob, jobKey, pollStatus])

  useEffect(() => () => stopPolling(), [stopPolling])

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
  }
}

function useLegacyCaseExportJob(args: UseCaseExportJobArgs, paramsHash: string, jobKey: string) {
  const { tenantId, caseId, caseTitle, format } = args
  const idempotencyKey = useMemo(() => deriveIdempotencyKey(tenantId, caseId, paramsHash), [tenantId, caseId, paramsHash])
  const [job, setJob] = useState<ExportJobState | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const backoffRef = useRef(1500)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    backoffRef.current = 1500
  }, [])

  const pollStatus = useCallback(async () => {
    if (!job) return
    try {
      const status = await fetchExportJob(tenantId, caseId, job.jobId)
      const normalized = normalizeExportJobStatus(status, job)
      setJob((previous) =>
        previous
          ? {
              ...previous,
              status: normalized.lifecycle,
              progress: normalized.progress,
              downloadUrl: normalized.downloadUrl,
              error: normalized.error,
              updatedAt: normalized.updatedAt,
            }
          : previous
      )

      if (normalized.isTerminal) {
        stopPolling()
        if (normalized.lifecycle === 'ready') {
          recordTelemetryEvent('export_completed', job.jobId, job.startedAt)
        }
        return
      }

      backoffRef.current = Math.min(backoffRef.current * 1.5, 10000)
      const delay = withJitter(backoffRef.current)
      pollingRef.current = setTimeout(() => pollStatus(), delay)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch export status'
      setError(message)
      setJob((previous) => (previous ? { ...previous, status: 'failed', error: message } : previous))
      recordTelemetryEvent('export_failed', job.jobId, job.startedAt)
      stopPolling()
    }
  }, [caseId, job, stopPolling, tenantId])

  const createJob = useCallback(
    async (customIdempotencyKey?: string) => {
      try {
        setError(null)
        const response = await createExportJob({
          tenantId,
          caseId,
          format,
          options: args.options,
          paramsHash,
          idempotencyKey: customIdempotencyKey,
        })

        const nextJob = createJobEntry({
          tenantId,
          caseId,
          paramsHash,
          jobId: response.id,
          idempotencyKey: customIdempotencyKey ?? idempotencyKey,
          startedAt: response.startedAt,
        })

        setJob(nextJob)
        recordTelemetryEvent('export_started', response.id, nextJob.startedAt)
        await pollStatus()
        return nextJob
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start export'
        setError(message)
        return null
      }
    },
    [args.options, caseId, format, idempotencyKey, paramsHash, pollStatus, tenantId]
  )

  const startExport = useCallback(async () => {
    if (job && !['failed', 'complete', 'canceled'].includes(job.status)) {
      return job
    }

    return createJob()
  }, [createJob, job])

  const startNewExport = useCallback(async () => {
    const salt = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const freshKey = deriveIdempotencyKey(tenantId, caseId, paramsHash, salt)
    stopPolling()
    return createJob(freshKey)
  }, [caseId, createJob, paramsHash, stopPolling, tenantId])

  const cancel = useCallback(async () => {
    if (!job) return
    try {
      await cancelExportJob(tenantId, caseId, job.jobId)
    } finally {
      stopPolling()
      setJob((previous) => (previous ? { ...previous, status: 'canceled' } : previous))
    }
  }, [caseId, job, stopPolling, tenantId])

  const markDownload = useCallback(async () => {
    if (!job || !job.downloadUrl) return
    try {
      setJob((previous) => (previous ? { ...previous, status: 'downloading' } : previous))
      await triggerDownload(job.downloadUrl, sanitizeFilename(caseTitle, format))
      setJob((previous) => (previous ? { ...previous, status: 'complete' } : previous))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download export'
      setError(message)
      setJob((previous) => (previous ? { ...previous, status: 'failed', error: message } : previous))
    }
  }, [caseTitle, format, job])

  useEffect(() => () => stopPolling(), [stopPolling])

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
  }
}

export function useCaseExportJob(args: UseCaseExportJobArgs): ExportJobController {
  const paramsHash = useMemo(
    () =>
      computeExportParamsHash({
        tenantId: args.tenantId,
        caseId: args.caseId,
        format: args.format,
        options: args.options,
      }),
    [args.caseId, args.format, args.options, args.tenantId]
  )

  const jobKey = useMemo(() => resolveJobKey(args.tenantId, args.caseId, paramsHash), [args.caseId, args.tenantId, paramsHash])
  const mode = args.mode ?? 'durable'

  if (mode === 'legacy') {
    return useLegacyCaseExportJob(args, paramsHash, jobKey)
  }

  return useDurableCaseExportJob(args, paramsHash, jobKey)
}
