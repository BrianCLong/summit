import React, { useMemo } from 'react'
import { Entity, Relationship } from '@/types'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'

interface RelationshipMatrixWidgetProps {
  entities: Entity[]
  relationships: Relationship[]
  className?: string
  onCellClick?: (
    source: Entity,
    target: Entity,
    relationships: Relationship[]
  ) => void
}

export function RelationshipMatrixWidget({
  entities,
  relationships,
  className,
  onCellClick,
}: RelationshipMatrixWidgetProps) {
  // Memoize the matrix data structure
  const { matrix, sortedEntities } = useMemo(() => {
    // Sort entities by type and then name for better grouping
    const sorted = [...entities].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return a.name.localeCompare(b.name)
    })

    // Create a map for quick relationship lookup
    // Key: `${sourceId}-${targetId}`
    const relMap = new Map<string, Relationship[]>()
    relationships.forEach(rel => {
      const key = `${rel.sourceId}-${rel.targetId}`
      const reverseKey = `${rel.targetId}-${rel.sourceId}`

      // Store forward direction
      if (!relMap.has(key)) relMap.set(key, [])
      relMap.get(key)!.push(rel)

      // Store reverse direction for undirected/bidirectional check or just to show connectivity in matrix
      // Usually matrix is Source (Row) -> Target (Col)
      // If we want a symmetric matrix for undirected graphs, we'd add it to both.
      // But let's stick to Source -> Target for directionality.
    })

    return { matrix: relMap, sortedEntities: sorted }
  }, [entities, relationships])

  // Helper to get color intensity based on relationship count or confidence
  const getCellColor = (rels: Relationship[] | undefined) => {
    if (!rels || rels.length === 0) return 'bg-transparent'

    // Simple logic: more relationships = darker color
    // Or use confidence. Let's use count for now.
    const count = rels.length
    if (count >= 3) return 'bg-primary'
    if (count === 2) return 'bg-primary/70'
    return 'bg-primary/40'
  }

  return (
    <div className={cn('overflow-auto h-full w-full', className)}>
      <div className="inline-block min-w-full">
        <div
          className="grid gap-px bg-muted"
          style={{
            gridTemplateColumns: `auto repeat(${sortedEntities.length}, minmax(40px, 1fr))`,
          }}
        >
          {/* Header Row */}
          <div className="sticky top-0 left-0 z-20 bg-background p-2 font-semibold text-xs border-b border-r">
            Matrix
          </div>
          {sortedEntities.map(entity => (
            <div
              key={`col-${entity.id}`}
              className="sticky top-0 z-10 bg-background p-2 text-xs font-medium border-b rotate-180 [writing-mode:vertical-lr] h-32 flex items-center justify-start truncate"
              title={entity.name}
            >
              <span className="truncate">{entity.name}</span>
            </div>
          ))}

          {/* Rows */}
          {sortedEntities.map(sourceEntity => (
            <React.Fragment key={`row-${sourceEntity.id}`}>
              {/* Row Header */}
              <div
                className="sticky left-0 z-10 bg-background p-2 text-xs font-medium border-r truncate flex items-center w-32"
                title={sourceEntity.name}
              >
                <span className="truncate">{sourceEntity.name}</span>
              </div>

              {/* Cells */}
              {sortedEntities.map(targetEntity => {
                const key = `${sourceEntity.id}-${targetEntity.id}`
                const rels = matrix.get(key)
                const isSelf = sourceEntity.id === targetEntity.id

                return (
                  <div
                    key={`cell-${sourceEntity.id}-${targetEntity.id}`}
                    className={cn(
                      'h-10 w-full flex items-center justify-center border border-muted/20 relative group transition-colors',
                      isSelf ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
                    )}
                    onClick={() =>
                      rels && onCellClick?.(sourceEntity, targetEntity, rels)
                    }
                  >
                    {rels && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'w-6 h-6 rounded-sm cursor-pointer',
                              getCellColor(rels)
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-semibold">
                              {sourceEntity.name} → {targetEntity.name}
                            </p>
                            <p>{rels.length} relationship(s)</p>
                            <ul className="list-disc pl-3 mt-1 text-muted-foreground">
                              {rels.map(r => (
                                <li key={r.id}>{r.type}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
