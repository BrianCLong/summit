import React from 'react'
import { useWorkbenchStore } from '../store/viewStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Badge } from '@/components/ui/Badge'
import type { Entity } from '@/types'

interface InspectorPanelProps {
  entities: Entity[] // All available entities to lookup details
}

export function InspectorPanel({ entities }: InspectorPanelProps) {
  const { selectedEntityIds } = useWorkbenchStore()

  const selectedEntities = entities.filter(e => selectedEntityIds.includes(e.id))

  if (selectedEntities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <p>Select an entity to view details</p>
      </div>
    )
  }

  if (selectedEntities.length > 1) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">{selectedEntities.length} items selected</h2>
        </div>
        <ScrollArea className="flex-1 p-4">
           <div className="space-y-4">
             <div>
               <h3 className="text-sm font-medium mb-2">Summary</h3>
               <div className="flex flex-wrap gap-2">
                 {/* Count by type */}
                 {Object.entries(selectedEntities.reduce((acc, e) => {
                   acc[e.type] = (acc[e.type] || 0) + 1
                   return acc
                 }, {} as Record<string, number>)).map(([type, count]) => (
                   <Badge key={type} variant="secondary">{type}: {count}</Badge>
                 ))}
               </div>
             </div>
           </div>
        </ScrollArea>
      </div>
    )
  }

  const entity = selectedEntities[0]

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-muted/20">
        <h2 className="font-semibold text-lg">{entity.name}</h2>
        <Badge className="mt-2">{entity.type}</Badge>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <Section title="Attributes">
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-3">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="col-span-2 font-mono text-xs">{entity.id}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className="col-span-2">{(entity.confidence * 100).toFixed(0)}%</dd>
              </div>
              {/* Dynamic properties would go here */}
            </dl>
          </Section>

          <Section title="Notes">
             <div className="text-sm text-muted-foreground italic">
               No notes attached to this entity.
             </div>
          </Section>

          <Section title="Evidence">
             <div className="text-sm text-muted-foreground">
               Referenced in 3 reports.
             </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3 uppercase text-muted-foreground tracking-wider">{title}</h3>
      {children}
    </div>
  )
}
