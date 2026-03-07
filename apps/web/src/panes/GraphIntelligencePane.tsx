/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { Entity, Relationship } from '@/types'
import { cn } from '@/lib/utils'

// API helpers (mocked here, but would connect to the new endpoints)
async function fetchGraphAnalysis(algorithm: string, params?: unknown) {
  // In a real app, this fetches from /api/graph/${algorithm}
  // For now, we might need to just simulate or assume the backend works if we had a full integration test environment
  const response = await fetch(`/api/graph/${algorithm}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) throw new Error('Failed to fetch analysis')
  return response.json()
}

export function GraphIntelligencePane() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(
    null
  )
  const [results, setResults] = useState<any>(null)
  const [nodes, setNodes] = useState<Entity[]>([])
  const [links, setLinks] = useState<Relationship[]>([])

  const handleRunAlgorithm = async (algo: string) => {
    setSelectedAlgorithm(algo)
    try {
      const res = await fetchGraphAnalysis(algo)
      setResults(res)

      // If the algorithm returns nodes/scores, we update the graph visualization
      // This mapping depends on the exact shape of the API response
      // For this mock UI, we just show the raw results or assume a mapping
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Graph Intelligence & Influence Operations
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => handleRunAlgorithm('centrality')}
            variant={selectedAlgorithm === 'centrality' ? 'default' : 'outline'}
          >
            Influence (Centrality)
          </Button>
          <Button
            onClick={() => handleRunAlgorithm('communities')}
            variant={
              selectedAlgorithm === 'communities' ? 'default' : 'outline'
            }
          >
            Communities
          </Button>
          <Button
            onClick={() => handleRunAlgorithm('influence/bots')}
            variant={
              selectedAlgorithm === 'influence/bots' ? 'destructive' : 'outline'
            }
          >
            Detect Bots
          </Button>
          <Button
            onClick={() => handleRunAlgorithm('influence/coordinated')}
            variant={
              selectedAlgorithm === 'influence/coordinated'
                ? 'destructive'
                : 'outline'
            }
          >
            Coordinated Behavior
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[600px]">
        <div className="col-span-2 border rounded-lg overflow-hidden relative bg-slate-50 dark:bg-slate-900">
          {/*
              In a real implementation, we would pass the 'nodes' and 'links'
              derived from the algorithm results to GraphCanvas.
              For now, we render a placeholder or empty canvas.
            */}
          <GraphCanvas
            entities={nodes}
            relationships={links}
            layout={{ type: 'force' }}
          />
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Run an analysis to visualize the network
            </div>
          )}
        </div>

        <div className="col-span-1 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                {selectedAlgorithm
                  ? `Results for ${selectedAlgorithm}`
                  : 'Select an algorithm to view results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results ? (
                <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded max-h-[500px]">
                  {JSON.stringify(results, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No data generated yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
