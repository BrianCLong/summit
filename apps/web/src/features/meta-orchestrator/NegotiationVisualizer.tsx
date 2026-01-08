import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Negotiation {
  id: string
  topic: string
  status: string
  rounds: any[]
  tenantId: string
}

interface Agent {
  id: string
  name: string
  role: string
  status: string
}

export const NegotiationVisualizer: React.FC = () => {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedNegotiation, setSelectedNegotiation] =
    useState<Negotiation | null>(null)

  useEffect(() => {
    // Mock data fetch - replace with API call
    const fetchNegotiations = async () => {
      // const res = await fetch('/api/meta-orchestrator/negotiations');
      // const data = await res.json();
      // setNegotiations(data);
    }
    fetchNegotiations()
  }, [])

  return (
    <div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-4 border-r pr-4">
        <h2 className="text-xl font-bold mb-4">Active Negotiations</h2>
        <ScrollArea className="h-[600px]">
          {negotiations.map(neg => (
            <Card
              key={neg.id}
              className={`mb-4 cursor-pointer hover:bg-slate-50 ${selectedNegotiation?.id === neg.id ? 'border-primary' : ''}`}
              onClick={() => setSelectedNegotiation(neg)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex justify-between">
                  {neg.topic}
                  <Badge>{neg.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Rounds: {neg.rounds.length}
                </div>
              </CardContent>
            </Card>
          ))}
          {negotiations.length === 0 && (
            <div className="text-center text-muted-foreground p-8">
              No active negotiations
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="col-span-8">
        {selectedNegotiation ? (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedNegotiation.topic}
              </h2>
              <Badge variant="outline">{selectedNegotiation.status}</Badge>
            </div>

            <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-200 overflow-y-auto">
              {/* Visualization of rounds would go here - e.g. a timeline or chat view */}
              {selectedNegotiation.rounds.map((round, idx) => (
                <div key={round.id} className="mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      Round {round.roundNumber}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {round.proposals.map((prop: any) => (
                      <div
                        key={prop.id}
                        className="flex gap-4 p-4 bg-white rounded shadow-sm border"
                      >
                        <div className="font-bold text-sm w-24 shrink-0">
                          {prop.agentId}
                        </div>
                        <div className="text-sm">
                          {JSON.stringify(prop.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a negotiation to view details
          </div>
        )}
      </div>
    </div>
  )
}
