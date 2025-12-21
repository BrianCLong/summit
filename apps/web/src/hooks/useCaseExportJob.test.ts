import { describe, expect, it } from 'vitest'
import { normalizeExportJobStatus } from './useCaseExportJob'
import type { ExportJobState } from '@/types/export'

const baseJob: ExportJobState = {
  jobId: 'job-1',
  tenantId: 'tenant-1',
  caseId: 'case-1',
  paramsHash: 'hash-1',
  idempotencyKey: 'key-1',
  status: 'in_progress',
  progress: 45,
  startedAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('normalizeExportJobStatus', () => {
  it('continues polling when completed without download url', () => {
    const normalized = normalizeExportJobStatus(
      {
        id: baseJob.jobId,
        status: 'completed',
        progress: 100,
      },
      baseJob
    )

    expect(normalized.lifecycle).toBe('in_progress')
    expect(normalized.isTerminal).toBe(false)
    expect(normalized.progress).toBe(100)
  })

  it('marks ready only when a download url is present', () => {
    const normalized = normalizeExportJobStatus(
      {
        id: baseJob.jobId,
        status: 'completed',
        progress: 100,
        downloadUrl: 'https://example.com/file.pdf',
      },
      baseJob
    )

    expect(normalized.lifecycle).toBe('ready')
    expect(normalized.isTerminal).toBe(true)
    expect(normalized.downloadUrl).toContain('file.pdf')
  })

  it('reuses previous progress when missing', () => {
    const normalized = normalizeExportJobStatus(
      {
        id: baseJob.jobId,
        status: 'running',
      },
      baseJob
    )

    expect(normalized.progress).toBe(baseJob.progress)
    expect(normalized.isTerminal).toBe(false)
    expect(normalized.lifecycle).toBe('in_progress')
  })
})
