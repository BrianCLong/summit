import React, { useState } from 'react'
import { useWorkbenchStore } from '../store/viewStore'
import { LinkAnalysisCanvas } from '../canvas/LinkAnalysisCanvas'
import { InspectorPanel } from '../inspector/InspectorPanel'
import { Button } from '@/components/ui/Button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import { PanelLeft, PanelRight, Save, Layout } from 'lucide-react'
import type { Entity, Relationship } from '@/types'

// Mock Data for Shell Dev
const MOCK_NODES: Entity[] = [
  { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.9 },
  { id: '2', name: 'Acme Corp', type: 'ORGANIZATION', confidence: 0.95 },
  { id: '3', name: 'Project X', type: 'PROJECT', confidence: 0.8 },
]
const MOCK_EDGES: Relationship[] = [
  { id: 'e1', sourceId: '1', targetId: '2', type: 'WORKS_FOR', confidence: 0.9 },
  { id: 'e2', sourceId: '1', targetId: '3', type: 'LEADS', confidence: 0.7 },
]

export function WorkbenchShell() {
  const {
    leftRailOpen, toggleLeftRail,
    rightRailOpen, toggleRightRail,
    saveView
  } = useWorkbenchStore()

  // In a real app, these would come from a query hook
  const [nodes] = useState<Entity[]>(MOCK_NODES)
  const [edges] = useState<Relationship[]>(MOCK_EDGES)

  const handleSaveView = () => {
    saveView({
      id: crypto.randomUUID(),
      name: `Snapshot ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      state: {
        nodes,
        edges,
        transform: { x: 0, y: 0, k: 1 },
        filters: { types: [], timeRange: null },
        selection: []
      }
    })
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Header / Toolbar could go here */}

      {/* Left Rail: Context/Case */}
      <aside
        className={`
          border-r bg-muted/10 transition-all duration-300 ease-in-out flex flex-col
          ${leftRailOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className="p-4 border-b font-semibold flex justify-between items-center">
          <span>Case Files</span>
        </div>
        <div className="p-4 flex-1">
          <div className="text-sm text-muted-foreground">Case Context</div>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="p-2 bg-accent rounded cursor-pointer">Operation Chimera</li>
            <li className="p-2 hover:bg-muted rounded cursor-pointer">Suspicious Flows</li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center px-4 justify-between bg-card">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLeftRail}
                  aria-label="Toggle case files"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle case files</p>
              </TooltipContent>
            </Tooltip>
            <span className="font-medium text-sm">Investigator Workbench</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveView}>
              <Save className="h-4 w-4 mr-2" />
              Save View
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRightRail}
                  aria-label="Toggle inspector"
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle inspector</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
           <LinkAnalysisCanvas nodes={nodes} edges={edges} />
        </div>
      </main>

      {/* Right Rail: Inspector */}
      <aside
        className={`
          border-l bg-muted/10 transition-all duration-300 ease-in-out flex flex-col
          ${rightRailOpen ? 'w-80' : 'w-0 opacity-0 overflow-hidden'}
        `}
      >
        <InspectorPanel entities={nodes} />
      </aside>
    </div>
  )
}
