import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Info, Filter, AlertCircle, ShieldCheck, TrendingUp } from 'lucide-react'

export interface ExplainData {
  activeFilters: {
    label: string
    value: string
  }[]
  assumptions: {
    id: string
    description: string
    confidence: number
  }[]
  topEntities: {
    id: string
    name: string
    score: number
    reason: string
  }[]
  provenanceStats: {
    trustedSources: number
    totalSources: number
    averageConfidence: number
  }
}

interface ExplainSidebarProps {
  open: boolean
  data: ExplainData
  className?: string
}

export function ExplainSidebar({ open, data, className }: ExplainSidebarProps) {
  if (!open) return null

  return (
    <div className={`h-full overflow-y-auto bg-background border-l ${className}`}>
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Explain This View</h2>
        </div>

        {/* Key Filters */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Filter className="h-4 w-4" /> Active Filters
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.activeFilters.length > 0 ? (
              data.activeFilters.map((filter, idx) => (
                <Badge key={idx} variant="secondary">
                  {filter.label}: {filter.value}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No active filters</span>
            )}
          </div>
        </section>

        <Separator />

        {/* Assumptions */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Key Assumptions
          </h3>
          <ul className="space-y-3">
            {data.assumptions.map(assumption => (
              <li key={assumption.id} className="text-sm">
                <p>{assumption.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={assumption.confidence * 100} className="h-1.5 w-16" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(assumption.confidence * 100)}% conf
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Top Contributors */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Top Contributors
          </h3>
          <div className="space-y-3">
            {data.topEntities.map(entity => (
              <div key={entity.id} className="bg-muted/30 p-2 rounded text-sm">
                <div className="font-medium flex justify-between">
                  <span>{entity.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {entity.score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{entity.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Provenance Highlights */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Provenance
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-2xl font-bold">{data.provenanceStats.trustedSources}</div>
              <div className="text-xs text-muted-foreground">Trusted Sources</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-2xl font-bold">{Math.round(data.provenanceStats.averageConfidence * 100)}%</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
