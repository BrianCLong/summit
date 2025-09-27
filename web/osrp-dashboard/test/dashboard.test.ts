import { describe, expect, it } from 'vitest'
import successManifest from '../fixtures/rollout_success_manifest.json'
import failureManifest from '../fixtures/rollout_failure_manifest.json'
import { RolloutManifest } from '../src/manifest'
import { buildDashboardView, formatPlanSummary } from '../src/view-model'

describe('buildDashboardView', () => {
  it('summarises an approved rollout', () => {
    const view = buildDashboardView(successManifest as RolloutManifest)
    expect(view.release).toBe('osrp-demo')
    expect(view.overallStatus).toBe('approved')
    expect(view.stages).toHaveLength(3)
    expect(view.guardrails.every(g => g.status === 'pass')).toBe(true)
    const summary = formatPlanSummary(view)
    expect(summary).toContain('Status: approved')
    expect(summary).toContain('• ga (100% traffic) — approved')
  })

  it('flags auto-revert when breaches exist', () => {
    const view = buildDashboardView(failureManifest as RolloutManifest)
    expect(view.overallStatus).toBe('auto-revert')
    expect(view.autoRevertTrigger).toBe('policy-and-product-violation')
    expect(view.guardrails.some(g => g.status === 'breach')).toBe(true)
    const summary = formatPlanSummary(view)
    expect(summary).toContain('Status: auto-revert')
    expect(summary).toContain('Guardrail breaches: block-rate (policy')
  })
})
