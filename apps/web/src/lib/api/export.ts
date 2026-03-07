import type {
  ExportJobPayload,
  ExportJobStatusResponse,
  ExportOptions,
  ExportFormat,
} from '@/types/export'
import { deriveIdempotencyKey } from '@/lib/exportUtils'

interface CreateExportParams {
  tenantId: string
  caseId: string
  format: ExportFormat
  options: ExportOptions
  paramsHash: string
  idempotencyKey?: string
}

export async function createExportJob(params: CreateExportParams) {
  const {
    tenantId,
    caseId,
    paramsHash,
    idempotencyKey: explicitKey,
    ...body
  } = params
  const idempotencyKey =
    explicitKey ?? deriveIdempotencyKey(tenantId, caseId, paramsHash)
  const response = await fetch(
    `/api/tenants/${tenantId}/cases/${caseId}/exports`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        ...body,
        idempotencyKey,
      } satisfies ExportJobPayload),
    }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(`Failed to create export job: ${message}`)
  }

  return response.json() as Promise<{
    id: string
    status: string
    startedAt?: string
  }>
}

export async function fetchExportJob(
  tenantId: string,
  caseId: string,
  jobId: string
): Promise<ExportJobStatusResponse> {
  const response = await fetch(
    `/api/tenants/${tenantId}/cases/${caseId}/exports/${jobId}`
  )

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(`Failed to fetch export status: ${message}`)
  }

  return response.json()
}

export async function cancelExportJob(
  tenantId: string,
  caseId: string,
  jobId: string
): Promise<void> {
  const response = await fetch(
    `/api/tenants/${tenantId}/cases/${caseId}/exports/${jobId}`,
    {
      method: 'DELETE',
    }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(`Failed to cancel export job: ${message}`)
  }
}

export async function triggerDownload(url: string, filename?: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || ''
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
