import React, { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Clock, Copy, Plus, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import type { InvestigationSnapshot } from '@/types'

// Types (should be in types/index.ts but adding here for now if not present)
// interface InvestigationSnapshot {
//   id: string
//   investigationId: string
//   data: any
//   snapshotLabel: string
//   createdAt: string
//   createdBy: string
// }

const GET_SNAPSHOTS = gql`
  query GetInvestigationSnapshots($investigationId: ID!) {
    investigationSnapshots(investigationId: $investigationId) {
      id
      investigationId
      data
      snapshotLabel
      createdAt
      createdBy
    }
  }
`

const CREATE_SNAPSHOT = gql`
  mutation CreateInvestigationSnapshot($investigationId: ID!, $label: String) {
    createInvestigationSnapshot(investigationId: $investigationId, label: $label) {
      id
      createdAt
      snapshotLabel
    }
  }
`

interface SnapshotManagerProps {
  investigationId: string
  onClose?: () => void
}

export function SnapshotManager({ investigationId, onClose }: SnapshotManagerProps) {
  const { data, loading, error, refetch } = useQuery(GET_SNAPSHOTS, {
    variables: { investigationId },
    fetchPolicy: 'cache-and-network',
  })

  const [createSnapshot, { loading: creating }] = useMutation(CREATE_SNAPSHOT, {
    onCompleted: () => refetch(),
  })

  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'diff'>('list')

  const handleCreateSnapshot = () => {
    const label = prompt('Enter a label for this snapshot (optional):')
    createSnapshot({ variables: { investigationId, label: label || 'Manual Snapshot' } })
  }

  const handleToggleSelect = (id: string) => {
    if (selectedSnapshots.includes(id)) {
      setSelectedSnapshots(prev => prev.filter(sid => sid !== id))
    } else {
      if (selectedSnapshots.length < 2) {
        setSelectedSnapshots(prev => [...prev, id])
      } else {
        // Replace the oldest selection
        setSelectedSnapshots(prev => [prev[1], id])
      }
    }
  }

  const handleCompare = () => {
    if (selectedSnapshots.length === 2) {
      setViewMode('diff')
    }
  }

  if (viewMode === 'diff') {
    const snap1 = data?.investigationSnapshots.find((s: any) => s.id === selectedSnapshots[0])
    const snap2 = data?.investigationSnapshots.find((s: any) => s.id === selectedSnapshots[1])

    return (
      <div className="flex flex-col h-full bg-background border rounded-lg shadow-sm">
         <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <ArrowLeftRight className="mr-2 h-5 w-5" />
            Comparing Snapshots
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
            Back to List
          </Button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-auto">
          <SnapshotView snapshot={snap1} />
          <SnapshotView snapshot={snap2} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          History & Snapshots
        </h3>
        <Button size="sm" onClick={handleCreateSnapshot} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? 'Saving...' : 'New Snapshot'}
        </Button>
      </div>

      <div className="p-2 border-b bg-muted/20">
        <div className="flex items-center justify-between px-2">
            <span className="text-sm text-muted-foreground">
                {selectedSnapshots.length} selected
            </span>
            <Button
                size="sm"
                variant="default"
                disabled={selectedSnapshots.length !== 2}
                onClick={handleCompare}
            >
                Compare Selected
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-center p-4">Loading snapshots...</div>}
        {error && <div className="text-red-500 p-4">Error: {error.message}</div>}

        {!loading && data?.investigationSnapshots.length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            No snapshots found. Create one to track changes.
          </div>
        )}

        {data?.investigationSnapshots.map((snap: any) => (
          <Card
            key={snap.id}
            className={`p-3 cursor-pointer transition-colors ${
                selectedSnapshots.includes(snap.id) ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleToggleSelect(snap.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{snap.snapshotLabel || 'Untitled Snapshot'}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(snap.createdAt), 'MMM d, yyyy HH:mm:ss')} • {snap.createdBy}
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {snap.id.substring(0, 8)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SnapshotView({ snapshot }: { snapshot: any }) {
    if (!snapshot) return <div>Snapshot not found</div>

    return (
        <div className="border rounded p-4 h-full overflow-auto bg-card">
            <div className="mb-4 pb-2 border-b">
                <h4 className="font-semibold">{snapshot.snapshotLabel}</h4>
                <div className="text-xs text-muted-foreground">
                    {format(new Date(snapshot.createdAt), 'PPpp')}
                </div>
            </div>
            <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(snapshot.data, null, 2)}
            </pre>
        </div>
    )
}
