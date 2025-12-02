export type LineageLinkType = 'source' | 'transform' | 'claim' | 'case' | 'report'

export interface LineageLink {
  id: string
  label: string
  type: LineageLinkType
  tags: string[]
  restricted?: boolean
}

export interface LineageGraph {
  targetId: string
  targetType: 'evidence' | 'case' | 'claim'
  policyTags: string[]
  upstream: LineageLink[]
  downstream: LineageLink[]
  restricted?: boolean
  restrictionReason?: string
  mode?: string
}
