import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Scale,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import { selectExplain } from '@/features/explain/explainSlice'
import { selectSelectedEntityIds, selectTimeRange } from '@/features/viewSync/viewSyncSlice'
import type { Entity, Relationship, TimelineEvent } from '@/types'

interface ExplainPanelProps {
  entities?: Entity[]
  relationships?: Relationship[]
  timelineEvents?: TimelineEvent[]
  className?: string
}

export function ExplainPanel({
  entities = [],
  relationships = [],
  timelineEvents = [],
  className,
}: ExplainPanelProps) {
  const explainState = useAppSelector(selectExplain)
  const selectedEntityIds = useAppSelector(selectSelectedEntityIds)
  const timeRange = useAppSelector(selectTimeRange)

  const [expandedSections, setExpandedSections] = useState({
    evidence: true,
    dissent: false,
    policy: false,
    analysis: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Filter to selected entities
  const selectedEntities = entities.filter(e => selectedEntityIds.includes(e.id))

  // Generate evidence map
  const evidenceMap = generateEvidenceMap(selectedEntities, relationships, timelineEvents)

  // Generate dissent/contradictions
  const dissent = generateDissent(selectedEntities, relationships)

  // Get policy bindings
  const policyBindings = explainState.policy

  // Generate analysis
  const analysis = generateAnalysis(selectedEntities, relationships, timeRange)

  return (
    <div className={cn('h-full flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Explain this View
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Evidence, contradictions, and policy analysis for current selection
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Analysis Summary */}
        <CollapsibleSection
          title="Analysis Summary"
          icon={Info}
          isExpanded={expandedSections.analysis}
          onToggle={() => toggleSection('analysis')}
          count={analysis.insights.length}
        >
          <div className="space-y-3">
            {analysis.insights.map((insight, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-medium">{insight.title}</p>
                <p className="text-muted-foreground text-xs mt-1">{insight.description}</p>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <StatCard label="Entities" value={selectedEntities.length} />
            <StatCard label="Relationships" value={relationships.length} />
            <StatCard label="Events" value={timelineEvents.length} />
            <StatCard
              label="Avg Confidence"
              value={`${Math.round(analysis.avgConfidence * 100)}%`}
            />
          </div>
        </CollapsibleSection>

        {/* Evidence Map */}
        <CollapsibleSection
          title="Evidence Map"
          icon={FileText}
          isExpanded={expandedSections.evidence}
          onToggle={() => toggleSection('evidence')}
          count={evidenceMap.length}
        >
          <div className="space-y-2">
            {evidenceMap.map(evidence => (
              <EvidenceCard key={evidence.id} evidence={evidence} />
            ))}
            {evidenceMap.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No evidence available for current selection
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Dissent & Contradictions */}
        <CollapsibleSection
          title="Dissent & Contradictions"
          icon={AlertTriangle}
          isExpanded={expandedSections.dissent}
          onToggle={() => toggleSection('dissent')}
          count={dissent.length}
          variant={dissent.length > 0 ? 'warning' : 'default'}
        >
          <div className="space-y-2">
            {dissent.map(item => (
              <DissentCard key={item.id} dissent={item} />
            ))}
            {dissent.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>No contradictions detected</span>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Policy Bindings */}
        <CollapsibleSection
          title="Policy Bindings"
          icon={Scale}
          isExpanded={expandedSections.policy}
          onToggle={() => toggleSection('policy')}
          count={policyBindings.length}
          variant={policyBindings.some(p => p.severity === 'block') ? 'error' : 'default'}
        >
          <div className="space-y-2">
            {policyBindings.map(policy => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
            {policyBindings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No policy bindings for current view
              </p>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  onToggle: () => void
  count?: number
  variant?: 'default' | 'warning' | 'error'
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  count,
  variant = 'default',
  children,
}: CollapsibleSectionProps) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-yellow-500',
    error: 'border-red-500',
  }

  return (
    <Card className={cn('border-l-4', variantStyles[variant])}>
      <CardHeader className="p-3">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left hover:bg-muted/50 -m-3 p-3 rounded transition-colors"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{title}</span>
            {count !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            )}
          </div>
        </button>
      </CardHeader>
      {isExpanded && <CardContent className="p-3 pt-0">{children}</CardContent>}
    </Card>
  )
}

// Evidence card
function EvidenceCard({ evidence }: { evidence: EvidenceItem }) {
  return (
    <div className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {evidence.type}
            </Badge>
            <span className="text-xs text-muted-foreground">{evidence.source}</span>
          </div>
          <p className="text-sm line-clamp-2">{evidence.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">
              Confidence: {Math.round(evidence.confidence * 100)}%
            </span>
            <span className="text-xs text-muted-foreground">{evidence.timestamp}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// Dissent card
function DissentCard({ dissent }: { dissent: DissentItem }) {
  return (
    <div className="p-3 border border-yellow-500/50 rounded-lg bg-yellow-500/5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{dissent.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{dissent.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {dissent.severity}
            </Badge>
            <span className="text-xs text-muted-foreground">{dissent.affectedItems} items</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Policy card
function PolicyCard({ policy }: { policy: { id: string; message: string; severity: string } }) {
  const severityConfig = {
    info: {
      icon: Info,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/5 border-blue-500/50',
    },
    warn: {
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500/5 border-yellow-500/50',
    },
    block: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/5 border-red-500/50',
    },
  }

  const config = severityConfig[policy.severity as keyof typeof severityConfig]
  const Icon = config.icon

  return (
    <div className={cn('p-3 border rounded-lg', config.bg)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm">{policy.message}</p>
          <Badge variant="outline" className="text-xs mt-2">
            {policy.severity.toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// Stat card
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 border rounded-lg bg-muted/30">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

// Helper types and functions
interface EvidenceItem {
  id: string
  type: string
  source: string
  content: string
  confidence: number
  timestamp: string
}

interface DissentItem {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  affectedItems: number
}

function generateEvidenceMap(
  entities: Entity[],
  relationships: Relationship[],
  events: TimelineEvent[]
): EvidenceItem[] {
  const evidence: EvidenceItem[] = []

  // Generate evidence from entities
  entities.slice(0, 5).forEach((entity, idx) => {
    evidence.push({
      id: `evidence-entity-${idx}`,
      type: 'Entity',
      source: entity.source || 'Unknown',
      content: `${entity.name} (${entity.type}) identified with ${Math.round(entity.confidence * 100)}% confidence`,
      confidence: entity.confidence,
      timestamp: new Date().toLocaleDateString(),
    })
  })

  // Generate evidence from relationships
  relationships.slice(0, 3).forEach((rel, idx) => {
    evidence.push({
      id: `evidence-rel-${idx}`,
      type: 'Relationship',
      source: 'Graph Analysis',
      content: `${rel.type} relationship detected between entities`,
      confidence: rel.confidence,
      timestamp: new Date().toLocaleDateString(),
    })
  })

  return evidence
}

function generateDissent(entities: Entity[], relationships: Relationship[]): DissentItem[] {
  const dissent: DissentItem[] = []

  // Detect low confidence entities
  const lowConfidenceEntities = entities.filter(e => e.confidence < 0.5)
  if (lowConfidenceEntities.length > 0) {
    dissent.push({
      id: 'dissent-confidence',
      title: 'Low Confidence Entities',
      description: `${lowConfidenceEntities.length} entities have confidence below 50%`,
      severity: 'medium',
      affectedItems: lowConfidenceEntities.length,
    })
  }

  // Detect missing sources
  const missingSourceEntities = entities.filter(e => !e.source)
  if (missingSourceEntities.length > 0) {
    dissent.push({
      id: 'dissent-sources',
      title: 'Missing Source Attribution',
      description: 'Some entities lack source attribution',
      severity: 'low',
      affectedItems: missingSourceEntities.length,
    })
  }

  return dissent
}

function generateAnalysis(
  entities: Entity[],
  relationships: Relationship[],
  timeRange: { start: string; end: string } | null
) {
  const avgConfidence =
    entities.length > 0
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
      : 0

  const insights = [
    {
      title: 'Network Density',
      description: `${relationships.length} relationships across ${entities.length} entities`,
    },
    {
      title: 'Data Quality',
      description: `Average confidence: ${Math.round(avgConfidence * 100)}%`,
    },
  ]

  if (timeRange) {
    insights.push({
      title: 'Time Range',
      description: `Filtering events from ${new Date(timeRange.start).toLocaleDateString()} to ${new Date(timeRange.end).toLocaleDateString()}`,
    })
  }

  return { insights, avgConfidence }
}
