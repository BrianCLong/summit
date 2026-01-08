import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExportJobLifecycle, ExportJobState } from '@/types/export'
import { buildExportKey } from '@/lib/exportUtils'

export interface ExportJobEntry extends ExportJobState {}

interface ExportJobsStore {
  jobs: Record<string, ExportJobEntry>
  getJob: (key: string) => ExportJobEntry | undefined
  upsertJob: (key: string, job: ExportJobEntry) => void
  updateStatus: (
    key: string,
    status: ExportJobLifecycle,
    updates?: Partial<Omit<ExportJobEntry, 'status' | 'jobId'>>
  ) => void
  clearJob: (key: string) => void
}

export const useExportJobsStore = create<ExportJobsStore>()(
  persist(
    (set, get) => ({
      jobs: {},
      getJob: key => get().jobs[key],
      upsertJob: (key, job) =>
        set(state => ({
          jobs: {
            ...state.jobs,
            [key]: job,
          },
        })),
      updateStatus: (key, status, updates) =>
        set(state => {
          const existing = state.jobs[key]
          if (!existing) return state
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
          }
        }),
      clearJob: key =>
        set(state => {
          const { [key]: _, ...rest } = state.jobs
          return { jobs: rest }
        }),
    }),
    {
      name: 'export-jobs',
      partialize: state => ({ jobs: state.jobs }),
    }
  )
)

export function createJobEntry(params: {
  tenantId: string
  caseId: string
  paramsHash: string
  jobId: string
  idempotencyKey: string
  startedAt?: string
}): ExportJobEntry {
  const startedAt = params.startedAt || new Date().toISOString()
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
  }
}

export function resolveJobKey(
  tenantId: string,
  caseId: string,
  paramsHash: string
): string {
  return buildExportKey(tenantId, caseId, paramsHash)
}
