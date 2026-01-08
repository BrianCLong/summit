import { describe, expect, it } from 'vitest'
import { createJobEntry, useExportJobsStore } from './exportJobsStore'
import type { ExportJobLifecycle } from '@/types/export'

const tenantId = 'tenant-a'
const caseId = 'case-1'
const paramsHash = 'hash-1'

const setJobStatus = (status: ExportJobLifecycle) => {
  useExportJobsStore.setState(state => {
    const job = Object.values(state.jobs)[0]
    if (!job) return state
    return {
      jobs: {
        ...state.jobs,
        [Object.keys(state.jobs)[0]]: {
          ...job,
          status,
        },
      },
    }
  })
}

describe('exportJobsStore', () => {
  it('creates and updates a job lifecycle', () => {
    const job = createJobEntry({
      tenantId,
      caseId,
      paramsHash,
      jobId: 'job-1',
      idempotencyKey: 'key-1',
    })
    const key = `${tenantId}::${caseId}::${paramsHash}`

    useExportJobsStore.getState().upsertJob(key, job)
    expect(useExportJobsStore.getState().jobs[key].status).toBe('creating')

    setJobStatus('in_progress')
    expect(useExportJobsStore.getState().jobs[key].status).toBe('in_progress')

    useExportJobsStore
      .getState()
      .updateStatus(key, 'ready', {
        progress: 100,
        downloadUrl: 'http://example.com',
      })
    expect(useExportJobsStore.getState().jobs[key].status).toBe('ready')
    expect(useExportJobsStore.getState().jobs[key].progress).toBe(100)

    useExportJobsStore.getState().updateStatus(key, 'complete')
    expect(useExportJobsStore.getState().jobs[key].status).toBe('complete')
  })

  it('dedupes jobs by key', () => {
    const jobA = createJobEntry({
      tenantId,
      caseId,
      paramsHash,
      jobId: 'job-dedupe',
      idempotencyKey: 'key-a',
    })
    const key = `${tenantId}::${caseId}::${paramsHash}`

    useExportJobsStore.getState().upsertJob(key, jobA)
    const jobB = createJobEntry({
      tenantId,
      caseId,
      paramsHash,
      jobId: 'job-dedupe',
      idempotencyKey: 'key-b',
    })
    useExportJobsStore.getState().upsertJob(key, jobB)

    expect(Object.keys(useExportJobsStore.getState().jobs)).toHaveLength(1)
    expect(useExportJobsStore.getState().jobs[key].jobId).toBe('job-dedupe')
    expect(useExportJobsStore.getState().jobs[key].idempotencyKey).toBe('key-b')
  })
})
