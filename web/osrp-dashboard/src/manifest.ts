export interface StageObservations {
  blockRate: number
  canaryCatchRate: number
  latencyP95Ms: number
  businessKpi: number
}

export interface ManifestStage {
  name: string
  trafficPercent: number
  status: 'approved' | 'halted'
  observations: StageObservations
}

export type GuardrailCategory = 'policy' | 'product'
export type GuardrailStatus = 'pass' | 'breach'

export interface GuardrailResult {
  stage: string
  guardrail: string
  category: GuardrailCategory
  status: GuardrailStatus
  value: number
  threshold: number
  probability?: number
}

export interface AutoRevertConfig {
  enabled: boolean
  reason?: string
  trigger: 'none' | 'policy-violation' | 'product-violation' | 'policy-and-product-violation'
}

export interface RolloutManifest {
  version: string
  release: string
  plannedAt: string
  generatedAt: string
  stages: ManifestStage[]
  guardrails: GuardrailResult[]
  autoRevert: AutoRevertConfig
  signature: string
}
