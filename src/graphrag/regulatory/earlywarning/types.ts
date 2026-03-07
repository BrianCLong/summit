export interface EnforcementForecastSignal {
  institutionId: string
  regulator: 'CFPB' | 'SEC' | 'FTC' | 'OCC' | 'STATE_AG'
  product: string | null
  issue: string
  harm: string | null
  periodStart: string
  periodEnd: string
  complaintVolume: number
  complaintVelocity: number
  harmSeverityScore: number
  narrativeConvergenceScore: number
  crossSourceCorrelationScore: number
  enforcementRiskScore: number
  leadTimeDaysPredicted: number | null
}
