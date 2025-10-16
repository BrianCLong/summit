export interface PlanDocument {
  summary: {
    total_baseline_cost: number
    total_planned_cost: number
    total_savings_pct: number
  }
  plans: EndpointPlan[]
  metadata: Record<string, unknown>
}

export interface EndpointPlan {
  model: string
  endpoint: string
  autoscaling: {
    min_replicas: number
    max_replicas: number
    target_replicas: number
    target_utilization: number
  }
  quantization: {
    strategy: string
    latency_ms: number
    accuracy: number
    qps_capacity: number
    cost_per_replica: number
  }
  baseline: {
    replicas: number
    latency_ms: number
    accuracy: number
    cost_per_replica: number
    qps_capacity: number
    total_cost: number
  }
  planned_cost: number
  latency_headroom_ms: number
  accuracy_headroom: number
}

export interface DashboardEndpoint {
  id: string
  model: string
  endpoint: string
  baselineCost: number
  plannedCost: number
  savingsPct: number
  latencyHeadroomMs: number
  accuracyHeadroom: number
  quantizationStrategy: string
  targetReplicas: number
  capacityMarginPct: number
}

export interface ChartPoint {
  label: string
  value: number
}

export interface DashboardState {
  generatedAt?: string
  totals: {
    baselineCost: number
    plannedCost: number
    savingsPct: number
  }
  endpoints: DashboardEndpoint[]
  charts: {
    savingsByEndpoint: ChartPoint[]
    headroomByEndpoint: ChartPoint[]
    utilizationForecast: ChartPoint[]
  }
}

export function buildDashboardState(plan: PlanDocument): DashboardState {
  const generatedAt = typeof plan.metadata?.generated_at === 'string'
    ? (plan.metadata.generated_at as string)
    : undefined

  const endpoints = plan.plans.map<DashboardEndpoint>((endpointPlan) => {
    const id = `${endpointPlan.model}:${endpointPlan.endpoint}`
    const baselineCapacity = endpointPlan.baseline.replicas * endpointPlan.baseline.qps_capacity
    const plannedCapacity = endpointPlan.autoscaling.target_replicas * endpointPlan.quantization.qps_capacity
    const capacityMargin = plannedCapacity > 0
      ? (plannedCapacity - endpointPlan.autoscaling.target_replicas * endpointPlan.quantization.qps_capacity * endpointPlan.autoscaling.target_utilization) / plannedCapacity
      : 0

    return {
      id,
      model: endpointPlan.model,
      endpoint: endpointPlan.endpoint,
      baselineCost: endpointPlan.baseline.total_cost,
      plannedCost: endpointPlan.planned_cost,
      savingsPct: safeDivision(endpointPlan.baseline.total_cost - endpointPlan.planned_cost, endpointPlan.baseline.total_cost),
      latencyHeadroomMs: endpointPlan.latency_headroom_ms,
      accuracyHeadroom: endpointPlan.accuracy_headroom,
      quantizationStrategy: endpointPlan.quantization.strategy,
      targetReplicas: endpointPlan.autoscaling.target_replicas,
      capacityMarginPct: Math.round(capacityMargin * 1000) / 10,
    }
  })

  const savingsByEndpoint = endpoints.map<ChartPoint>((endpoint) => ({
    label: endpoint.id,
    value: Math.round(endpoint.savingsPct * 1000) / 10,
  }))

  const headroomByEndpoint = endpoints.map<ChartPoint>((endpoint) => ({
    label: endpoint.id,
    value: Math.round(endpoint.latencyHeadroomMs * 100) / 100,
  }))

  const utilizationForecast = computeUtilizationForecast(plan)

  return {
    generatedAt,
    totals: {
      baselineCost: plan.summary.total_baseline_cost,
      plannedCost: plan.summary.total_planned_cost,
      savingsPct: plan.summary.total_savings_pct,
    },
    endpoints,
    charts: {
      savingsByEndpoint,
      headroomByEndpoint,
      utilizationForecast,
    },
  }
}

export function computeUtilizationForecast(plan: PlanDocument, multipliers: number[] = [0.5, 1, 1.5]): ChartPoint[] {
  const points: ChartPoint[] = []
  for (const multiplier of multipliers) {
    let totalCapacity = 0
    let totalLoad = 0
    for (const endpoint of plan.plans) {
      const capacityPerReplica = endpoint.quantization.qps_capacity
      totalCapacity += capacityPerReplica * endpoint.autoscaling.target_replicas
      totalLoad += endpoint.quantization.qps_capacity * endpoint.autoscaling.target_replicas * multiplier
    }
    const utilization = totalCapacity > 0 ? totalLoad / totalCapacity : 0
    points.push({
      label: `${Math.round(multiplier * 100)}% load`,
      value: Math.round(utilization * 1000) / 10,
    })
  }
  return points
}

function safeDivision(numerator: number, denominator: number): number {
  if (Math.abs(denominator) < 1e-9) {
    return 0
  }
  return numerator / denominator
}

