import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { selectExplain, close, open } from './explainSlice'
import {
  Info,
  X,
  Filter,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Database,
  Activity,
} from 'lucide-react'
import type { Entity, Relationship } from '@/types'

interface ExplainViewSidebarProps {
  entities: Entity[]
  relationships: Relationship[]
  activeFilters?: {
    entityTypes?: string[]
    timeRange?: { start: Date; end: Date }
    confidenceThreshold?: number
    tags?: string[]
    sources?: string[]
  }
  className?: string
}

interface EntityContribution {
  entity: Entity
  score: number
  reasons: string[]
}

interface EdgeContribution {
  relationship: Relationship
  sourceEntity: Entity
  targetEntity: Entity
  score: number
  reasons: string[]
}

export function ExplainViewSidebar({
  entities,
  relationships,
  activeFilters,
  className,
}: ExplainViewSidebarProps) {
  const explainState = useAppSelector(selectExplain)
  const dispatch = useAppDispatch()
  const [expandedSections, setExpandedSections] = React.useState<
    Set<string>
  >(new Set(['filters', 'contributors', 'provenance', 'confidence']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Calculate top contributing entities based on centrality and confidence
  const topEntities = useMemo<EntityContribution[]>(() => {
    return entities
      .map(entity => {
        // Calculate degree centrality
        const connections = relationships.filter(
          r => r.sourceId === entity.id || r.targetId === entity.id
        ).length

        // Calculate reasons for contribution
        const reasons: string[] = []
        if (connections > 5) {
          reasons.push(`${connections} connections`)
        }
        if (entity.confidence > 0.9) {
          reasons.push('High confidence')
        }
        if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
          reasons.push('Key entity type')
        }

        // Weighted score
        const score = connections * 0.6 + entity.confidence * 0.4

        return { entity, score, reasons }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [entities, relationships])

  // Calculate top contributing edges
  const topEdges = useMemo<EdgeContribution[]>(() => {
    return relationships
      .map(relationship => {
        const sourceEntity = entities.find(e => e.id === relationship.sourceId)
        const targetEntity = entities.find(e => e.id === relationship.targetId)

        if (!sourceEntity || !targetEntity) {
          return null
        }

        const reasons: string[] = []
        if (relationship.confidence > 0.85) {
          reasons.push('High confidence')
        }
        if (
          sourceEntity.type === 'PERSON' &&
          targetEntity.type === 'ORGANIZATION'
        ) {
          reasons.push('Person-Organization link')
        }

        const score = relationship.confidence * 0.7 + 0.3

        return {
          relationship,
          sourceEntity,
          targetEntity,
          score,
          reasons,
        }
      })
      .filter((edge): edge is EdgeContribution => edge !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [entities, relationships])

  // Calculate confidence distribution
  const confidenceStats = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 }
    entities.forEach(entity => {
      if (entity.confidence >= 0.8) buckets.high++
      else if (entity.confidence >= 0.5) buckets.medium++
      else buckets.low++
    })

    const total = entities.length
    return {
      high: { count: buckets.high, percent: (buckets.high / total) * 100 },
      medium: {
        count: buckets.medium,
        percent: (buckets.medium / total) * 100,
      },
      low: { count: buckets.low, percent: (buckets.low / total) * 100 },
    }
  }, [entities])

  // Calculate provenance summary
  const provenanceSummary = useMemo(() => {
    const sources = new Set<string>()
    const licenses = new Set<string>()
    let avgConfidence = 0

    entities.forEach(entity => {
      // Mock source extraction from entity metadata
      if (entity.properties?.source) sources.add(entity.properties.source)
      if (entity.properties?.license) licenses.add(entity.properties.license)
      avgConfidence += entity.confidence
    })

    avgConfidence = entities.length > 0 ? avgConfidence / entities.length : 0

    return {
      sourceCount: sources.size,
      licenseTypes: Array.from(licenses),
      avgConfidence: Math.round(avgConfidence * 100),
    }
  }, [entities])

  if (!explainState.open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => dispatch(open())}
        className="fixed right-4 top-20 z-50"
        aria-label="Open Explain View"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Explain This View
      </Button>
    )
  }

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-background border-l shadow-2xl z-40 overflow-y-auto ${className}`}
      role="complementary"
      aria-label="Explain This View Sidebar"
    >
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Explain This View
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(close())}
            aria-label="Close Explain View"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Understanding the current investigation state
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Active Filters Section */}
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('filters')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Active Filters & Assumptions
              </span>
              {expandedSections.has('filters') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('filters') && (
            <CardContent className="space-y-3">
              {activeFilters?.entityTypes &&
                activeFilters.entityTypes.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Entity Types
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.entityTypes.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {activeFilters?.timeRange && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Time Range
                  </div>
                  <div className="text-xs">
                    {activeFilters.timeRange.start.toLocaleDateString()} -{' '}
                    {activeFilters.timeRange.end.toLocaleDateString()}
                  </div>
                </div>
              )}

              {activeFilters?.confidenceThreshold !== undefined && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Confidence Threshold
                  </div>
                  <div className="text-xs">
                    ≥ {Math.round(activeFilters.confidenceThreshold * 100)}%
                  </div>
                </div>
              )}

              {activeFilters?.tags && activeFilters.tags.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeFilters.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!activeFilters ||
                (Object.keys(activeFilters).length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    No active filters
                  </div>
                ))}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>
                    Showing {entities.length} entities, {relationships.length}{' '}
                    relationships
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Top Contributing Entities */}
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('contributors')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Contributors
              </span>
              {expandedSections.has('contributors') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('contributors') && (
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Key Entities
                </div>
                <div className="space-y-2">
                  {topEntities.map(({ entity, score, reasons }) => (
                    <Tooltip
                      key={entity.id}
                      content={
                        <div className="space-y-1 text-xs">
                          <div>
                            <strong>Type:</strong> {entity.type}
                          </div>
                          <div>
                            <strong>Confidence:</strong>{' '}
                            {Math.round(entity.confidence * 100)}%
                          </div>
                          <div>
                            <strong>Why important:</strong>
                          </div>
                          {reasons.map((reason, i) => (
                            <div key={i} className="ml-2">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <div className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {entity.name}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {entity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Score: {score.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Activity className="h-4 w-4 text-muted-foreground ml-2" />
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Key Relationships
                </div>
                <div className="space-y-2">
                  {topEdges.map(
                    ({ relationship, sourceEntity, targetEntity, reasons }) => (
                      <Tooltip
                        key={relationship.id}
                        content={
                          <div className="space-y-1 text-xs">
                            <div>
                              <strong>Type:</strong> {relationship.type}
                            </div>
                            <div>
                              <strong>Confidence:</strong>{' '}
                              {Math.round(relationship.confidence * 100)}%
                            </div>
                            <div>
                              <strong>Why important:</strong>
                            </div>
                            {reasons.map((reason, i) => (
                              <div key={i} className="ml-2">
                                • {reason}
                              </div>
                            ))}
                          </div>
                        }
                      >
                        <div className="p-2 rounded-lg border hover:bg-accent cursor-pointer">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium truncate">
                              {sourceEntity.name}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium truncate">
                              {targetEntity.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {relationship.type}
                          </div>
                        </div>
                      </Tooltip>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Provenance Highlights */}
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('provenance')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Provenance Highlights
              </span>
              {expandedSections.has('provenance') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('provenance') && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-accent">
                  <div className="text-2xl font-bold">
                    {provenanceSummary.sourceCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Data Sources
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-accent">
                  <div className="text-2xl font-bold">
                    {provenanceSummary.avgConfidence}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg Confidence
                  </div>
                </div>
              </div>

              {provenanceSummary.licenseTypes.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    License Types
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {provenanceSummary.licenseTypes.map(license => (
                      <Badge key={license} variant="secondary" className="text-xs">
                        {license}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>
                    All data tracked via provenance ledger for audit compliance
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Confidence Levels */}
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleSection('confidence')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Confidence Distribution
              </span>
              {expandedSections.has('confidence') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has('confidence') && (
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">High (≥80%)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {confidenceStats.high.count} (
                    {Math.round(confidenceStats.high.percent)}%)
                  </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${confidenceStats.high.percent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Medium (50-80%)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {confidenceStats.medium.count} (
                    {Math.round(confidenceStats.medium.percent)}%)
                  </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${confidenceStats.medium.percent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Low (&lt;50%)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {confidenceStats.low.count} (
                    {Math.round(confidenceStats.low.percent)}%)
                  </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${confidenceStats.low.percent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>
                    Higher confidence indicates more reliable entity resolution
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Policy Warnings */}
        {explainState.policy.length > 0 && (
          <Card className="border-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Policy Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {explainState.policy.map(item => (
                <div
                  key={item.id}
                  className={`p-2 rounded-lg border ${
                    item.severity === 'block'
                      ? 'bg-red-50 dark:bg-red-950 border-red-300'
                      : item.severity === 'warn'
                        ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300'
                        : 'bg-blue-50 dark:bg-blue-950 border-blue-300'
                  }`}
                >
                  <div className="text-xs">{item.message}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground italic p-3 bg-accent rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5" />
            <div>
              This panel explains the current view by showing active filters,
              most influential entities, data provenance, and confidence metrics.
              Use this to understand what's driving the analysis.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
