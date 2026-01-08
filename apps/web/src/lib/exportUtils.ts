import type { ExportFormat, ExportOptions } from '@/types/export'

export interface ExportParamsInput {
  tenantId: string
  caseId: string
  format: ExportFormat
  options: ExportOptions
}

function stableSortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => stableSortObject(item))
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableSortObject((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value
}

function hashString(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function computeExportParamsHash(params: ExportParamsInput): string {
  const normalized = stableSortObject(params)
  const serialized = JSON.stringify(normalized)
  return hashString(serialized)
}

export function buildExportKey(
  tenantId: string,
  caseId: string,
  paramsHash: string
): string {
  return `${tenantId}::${caseId}::${paramsHash}`
}

export function deriveIdempotencyKey(
  tenantId: string,
  caseId: string,
  paramsHash: string,
  salt?: string
): string {
  const base = `${tenantId}-${caseId}-${paramsHash}`
  if (!salt) return base
  return `${base}-${salt}`
}

export function sanitizeFilename(base: string, format: ExportFormat): string {
  const safeBase = base.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_{2,}/g, '_')
  return `${safeBase}.${format === 'pdf' ? 'pdf' : 'zip'}`
}

export function resolveJobKey(
  tenantId: string,
  caseId: string,
  paramsHash: string
): string {
  return buildExportKey(tenantId, caseId, paramsHash)
}
