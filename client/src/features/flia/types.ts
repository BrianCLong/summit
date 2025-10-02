export type PlaybookAction = {
  id: string
  description: string
  handler: string
  args?: string[]
  kwargs?: Record<string, unknown>
  result?: Record<string, unknown>
}

export type FliaPlaybook = {
  tests: PlaybookAction[]
  backfills: PlaybookAction[]
  cache_invalidations: PlaybookAction[]
}

export type ImpactedNode = {
  id: string
  type: string
  name: string
  owners: string[]
}

export type FliaReport = {
  change_id: string
  impacted_nodes: ImpactedNode[]
  impacted_models: ImpactedNode[]
  metrics_at_risk: string[]
  retrain_order: string[]
  playbook: FliaPlaybook
  playbook_results?: FliaPlaybook
}
