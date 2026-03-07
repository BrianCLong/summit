import { describe, expect, it } from 'vitest'
import {
  computeExportParamsHash,
  buildExportKey,
  deriveIdempotencyKey,
} from './exportUtils'
import type { ExportOptions } from '@/types/export'

describe('computeExportParamsHash', () => {
  const baseOptions: ExportOptions = {
    includeTimeline: true,
    includeGraphSnapshot: true,
    includeSources: true,
  }

  it('includes tenant and case identifiers', () => {
    const first = computeExportParamsHash({
      tenantId: 'tenant-a',
      caseId: 'case-1',
      format: 'pdf',
      options: baseOptions,
    })

    const second = computeExportParamsHash({
      tenantId: 'tenant-b',
      caseId: 'case-1',
      format: 'pdf',
      options: baseOptions,
    })

    expect(first).not.toEqual(second)
  })

  it('is stable regardless of option ordering', () => {
    const hashA = computeExportParamsHash({
      tenantId: 'tenant-a',
      caseId: 'case-1',
      format: 'zip',
      options: baseOptions,
    })

    const reordered: ExportOptions = {
      includeSources: baseOptions.includeSources,
      includeGraphSnapshot: baseOptions.includeGraphSnapshot,
      includeTimeline: baseOptions.includeTimeline,
    }

    const hashB = computeExportParamsHash({
      tenantId: 'tenant-a',
      caseId: 'case-1',
      format: 'zip',
      options: reordered,
    })

    expect(hashA).toEqual(hashB)
  })
})

describe('buildExportKey', () => {
  it('composes tenant, case, and hash', () => {
    const key = buildExportKey('tenant-1', 'case-9', 'abc123')
    expect(key).toBe('tenant-1::case-9::abc123')
  })
})

describe('deriveIdempotencyKey', () => {
  it('uses salt to generate a unique key', () => {
    const base = deriveIdempotencyKey('tenant', 'case', 'hash')
    const salted = deriveIdempotencyKey('tenant', 'case', 'hash', 'salt')

    expect(base).toBe('tenant-case-hash')
    expect(salted).toBe('tenant-case-hash-salt')
  })
})
