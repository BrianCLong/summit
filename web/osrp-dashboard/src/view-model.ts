import { GuardrailResult, GuardrailStatus, ManifestStage, RolloutManifest } from './manifest'

export interface StageSummary {
  name: string
  trafficPercent: number
  status: ManifestStage['status']
  blockRate: string
  canaryCatchRate: string
  latencyP95: string
  businessKpi: string
  breaches: string[]
}

export interface GuardrailSummary {
  stage: string
  guardrail: string
  category: GuardrailResult['category']
  status: GuardrailStatus
  value: string
  threshold: string
  probability?: string
}

export interface DashboardView {
  release: string
  generatedAt: string
  signature: string
  overallStatus: 'approved' | 'auto-revert'
  autoRevertTrigger: string
  autoRevertReason?: string
  stages: StageSummary[]
  guardrails: GuardrailSummary[]
}

export function buildDashboardView(manifest: RolloutManifest): DashboardView {
  const guardrailLookup = manifest.guardrails.reduce<Record<string, GuardrailSummary[]>>((acc, guardrail) => {
    const key = guardrail.stage
    const value = normaliseValue(guardrail.value)
    const threshold = normaliseValue(guardrail.threshold)
    const summary: GuardrailSummary = {
      stage: guardrail.stage,
      guardrail: guardrail.guardrail,
      category: guardrail.category,
      status: guardrail.status,
      value,
      threshold,
      probability: guardrail.probability !== undefined ? normaliseProbability(guardrail.probability) : undefined
    }
    acc[key] = acc[key] ? [...acc[key], summary] : [summary]
    return acc
  }, {})

  const stages: StageSummary[] = manifest.stages.map(stage => {
    const guardrails = guardrailLookup[stage.name] ?? []
    const breaches = guardrails.filter(g => g.status === 'breach').map(g => `${g.guardrail} (${g.category})`)
    return {
      name: stage.name,
      trafficPercent: stage.trafficPercent,
      status: stage.status,
      blockRate: formatPercent(stage.observations.blockRate),
      canaryCatchRate: formatPercent(stage.observations.canaryCatchRate),
      latencyP95: `${stage.observations.latencyP95Ms.toFixed(2)} ms`,
      businessKpi: stage.observations.businessKpi.toFixed(3),
      breaches
    }
  })

  const flattenedGuardrails = Object.values(guardrailLookup).flat().sort((a, b) => {
    if (a.stage === b.stage) {
      return a.guardrail.localeCompare(b.guardrail)
    }
    return a.stage.localeCompare(b.stage)
  })

  return {
    release: manifest.release,
    generatedAt: manifest.generatedAt,
    signature: manifest.signature,
    overallStatus: manifest.autoRevert.enabled ? 'auto-revert' : 'approved',
    autoRevertTrigger: manifest.autoRevert.trigger,
    autoRevertReason: manifest.autoRevert.reason,
    stages,
    guardrails: flattenedGuardrails
  }
}

export function formatPlanSummary(view: DashboardView): string {
  const lines = [
    `Release: ${view.release}`,
    `Generated: ${view.generatedAt}`,
    `Signature: ${view.signature}`,
    `Status: ${view.overallStatus}`,
    `Auto-revert trigger: ${view.autoRevertTrigger}`
  ]
  if (view.autoRevertReason) {
    lines.push(`Reason: ${view.autoRevertReason}`)
  }
  lines.push('')
  for (const stage of view.stages) {
    lines.push(`• ${stage.name} (${stage.trafficPercent}% traffic) — ${stage.status}`)
    lines.push(`  Block rate: ${stage.blockRate}, Canary catch: ${stage.canaryCatchRate}`)
    lines.push(`  Latency p95: ${stage.latencyP95}, Business KPI: ${stage.businessKpi}`)
    if (stage.breaches.length > 0) {
      lines.push(`  Guardrail breaches: ${stage.breaches.join(', ')}`)
    }
  }
  return lines.join('\n')
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function normaliseValue(value: number): string {
  if (Math.abs(value) >= 1) {
    return value.toFixed(3)
  }
  return (value).toFixed(4)
}

function normaliseProbability(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`
}
