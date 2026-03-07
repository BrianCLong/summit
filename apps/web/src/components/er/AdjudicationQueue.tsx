import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Split } from 'lucide-react'
import { ExplainPanel } from '@/features/er/ExplainPanel'

interface CandidateGroup {
  canonicalKey: string
  entities: any[] // In real app, define proper Entity type
}

export const AdjudicationQueue: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<CandidateGroup | null>(
    null
  )

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/er/candidates')
      if (res.ok) {
        const data = await res.json()
        // Transform the map/array response to local state
        // Assuming API returns array of groups
        setCandidates(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async (masterId: string, mergeIds: string[]) => {
    try {
      const res = await fetch('/er/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId,
          mergeIds,
          rationale: 'Manual adjudication',
        }),
      })
      if (res.ok) {
        // Remove from list
        setCandidates(prev => prev.filter(c => c !== selectedGroup))
        setSelectedGroup(null)
      } else {
        alert('Merge failed - check policy?')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-4 border-r pr-4">
        <h2 className="text-xl font-bold mb-4">Adjudication Queue</h2>
        <ScrollArea className="h-[80vh]">
          {loading && <div>Loading candidates...</div>}
          {candidates.map((group, idx) => (
            <Card
              key={idx}
              className={`mb-2 cursor-pointer ${selectedGroup === group ? 'border-primary' : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="p-4">
                <div className="font-semibold">Key: {group.canonicalKey}</div>
                <div className="text-sm text-gray-500">
                  {group.entities.length} candidates
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </div>

      <div className="col-span-8 pl-4">
        {selectedGroup ? (
          <EntityDiffPane group={selectedGroup} onMerge={handleMerge} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a candidate group to adjudicate
          </div>
        )}
      </div>
    </div>
  )
}

interface DiffPaneProps {
  group: CandidateGroup
  onMerge: (masterId: string, mergeIds: string[]) => void
}

interface FeatureContribution {
  feature: string
  value: number | boolean
  weight: number
  contribution: number
  normalizedContribution: number
}

interface ExplainResponse {
  score: number
  confidence: number
  method: string
  threshold: number
  rationale: string[]
  featureContributions: FeatureContribution[]
}

const EntityDiffPane: React.FC<DiffPaneProps> = ({ group, onMerge }) => {
  const [masterId, setMasterId] = useState<string>(group.entities[0]?.id)
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null)

  useEffect(() => {
    // Fetch explanation for the group relative to master
    if (group.entities.length > 1) {
      const normalizeEntity = (entity: any) => ({
        id: entity.id,
        type: entity.type || 'entity',
        name: entity.properties?.name || entity.name || 'Unknown',
        tenantId: entity.tenantId || 'unknown',
        attributes: entity.properties || entity.attributes || {},
        aliases: entity.aliases,
        locations: entity.locations,
        timestamps: entity.timestamps,
        deviceIds: entity.deviceIds,
        accountIds: entity.accountIds,
        ipAddresses: entity.ipAddresses,
      })

      fetch('/er/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityA: normalizeEntity(group.entities[0]),
          entityB: normalizeEntity(group.entities[1]),
        }),
      })
        .then(res => res.json())
        .then(data => setExplanation(data))
        .catch(console.error)
    }
  }, [group, masterId])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Merge Candidates</h3>
        <Button
          variant="default"
          onClick={() =>
            onMerge(
              masterId,
              group.entities.map(e => e.id).filter(id => id !== masterId)
            )
          }
        >
          <Split className="mr-2 h-4 w-4" /> Merge into Master
        </Button>
      </div>

      {explanation && <ExplainPanel details={explanation} />}

      <div className="grid grid-cols-2 gap-4">
        {group.entities.map(entity => (
          <Card
            key={entity.id}
            className={`cursor-pointer ${masterId === entity.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setMasterId(entity.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                {entity.properties.name || 'Unnamed'}
                {masterId === entity.id && <Badge>Master</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>ID: {entity.id}</div>
              <div>Email: {entity.properties.email}</div>
              <div>
                Geo: {entity.properties.lat}, {entity.properties.lon}
              </div>
              {entity.lacLabels && (
                <div className="text-red-500 text-xs">
                  LAC: {entity.lacLabels.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
