export interface UsageRollup {
  dimension: string
  periodStart: string
  periodEnd: string
  totalQuantity: number
  unit?: string
  breakdown?: Record<string, unknown>
  estimatedCost?: number
}

export interface UsageRollupResponse {
  tenantId: string
  window: { from: string; to: string }
  rollups: UsageRollup[]
  totalEstimatedCost?: number
}

export interface UsageRollupParams {
  from?: string
  to?: string
  dimension?: string
  dimensions?: string[]
  limit?: number
}

const buildQueryString = (params: UsageRollupParams) => {
  const query = new URLSearchParams()
  if (params.from) {
    query.set('from', params.from)
  }
  if (params.to) {
    query.set('to', params.to)
  }
  if (params.dimension) {
    query.set('dimension', params.dimension)
  }
  if (params.dimensions) {
    params.dimensions.forEach(value => query.append('dimensions', value))
  }
  if (params.limit) {
    query.set('limit', String(params.limit))
  }
  return query.toString()
}

export const fetchTenantUsageRollups = async (
  tenantId: string,
  params: UsageRollupParams = {}
): Promise<UsageRollupResponse> => {
  const queryString = buildQueryString(params)
  const response = await fetch(
    `/api/tenants/${tenantId}/usage${queryString ? `?${queryString}` : ''}`
  )

  if (!response.ok) {
    throw new Error('Failed to load usage rollups')
  }

  return response.json()
}

export const buildUsageExportUrl = (
  tenantId: string,
  format: 'csv' | 'json',
  params: UsageRollupParams = {}
) => {
  const queryString = buildQueryString(params)
  return `/api/tenants/${tenantId}/usage/export.${format}${
    queryString ? `?${queryString}` : ''
  }`
}
