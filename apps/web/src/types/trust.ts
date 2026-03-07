// apps/web/src/types/trust.ts

export type TrustDimension =
  | 'TRUTH'
  | 'RELIABILITY'
  | 'GOVERNANCE'
  | 'TRANSPARENCY'

export interface TrustMetric {
  id: string
  dimension: TrustDimension
  label: string
  value: number
  unit: string
  trend: 'UP' | 'DOWN' | 'STABLE'
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  description: string
}

export interface TrustSignal {
  id: string
  timestamp: string
  dimension: TrustDimension
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  source: 'SUPPORT' | 'SYSTEM' | 'SURVEY' | 'SOCIAL'
  summary: string
}

export interface TrustHealthData {
  overallScore: number // 0-100
  dimensions: Record<
    TrustDimension,
    {
      score: number
      trend: 'UP' | 'DOWN' | 'STABLE'
      metrics: TrustMetric[]
    }
  >
  recentSignals: TrustSignal[]
}
