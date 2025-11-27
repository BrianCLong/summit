import { LineageGraph } from './types'

export async function fetchLineageGraph(entityId: string): Promise<LineageGraph> {
  const response = await fetch(`/api/lineage/${entityId}`)
  if (!response.ok) {
    throw new Error(`Unable to fetch lineage for ${entityId}`)
  }
  const payload = (await response.json()) as LineageGraph
  return payload
}
