import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import { casesApi } from '@/api/cases'
import { graphApi } from '@/api/graph'
import { analyticsApi } from '@/api/analytics'

import { AnalystConsole, generateMockDataset } from '@/features/analyst-console'
import type { Case, Task, Evidence } from '@/api/types'
import type { AnalystEntity, AnalystLink, AnalystEvent, AnalystLocation } from '@/features/analyst-console/types'

// Mock data helpers (for initial load fallback)
const getMockCase = (id: string): Case => ({
  id,
  title: 'Suspicious Financial Activity - North America',
  description: 'Investigation into layered transactions across multiple shell companies in Delaware and Nevada. Initial triggers indicate potential money laundering activities connected to offshore accounts.',
  status: 'investigating',
  priority: 'high',
  assignee: 'Alice Analyst',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
})

const getMockTasks = (caseId: string): Task[] => [
  { id: '1', caseId, title: 'Verify shell company registration', description: 'Check Delaware registry for specific entities', status: 'done', assignee: 'Alice', dueDate: new Date().toISOString() },
  { id: '2', caseId, title: 'Trace transaction flow', description: 'Map out the funds transfer path', status: 'in_progress', assignee: 'Alice', dueDate: new Date().toISOString() },
  { id: '3', caseId, title: 'Cross-reference watchlists', description: 'Check beneficiaries against OFAC list', status: 'todo', assignee: 'Bob' },
]

const getMockEvidence = (caseId: string): Evidence[] => [
  { id: '1', caseId, type: 'document', content: 'Bank Statement - Oct 2024', source: 'Financial Intelligence Unit', timestamp: new Date().toISOString(), confidence: 0.95 },
  { id: '2', caseId, type: 'report', content: 'Suspicious Activity Report #8821', source: 'Bank A', timestamp: new Date().toISOString(), confidence: 0.8 },
  { id: '3', caseId, type: 'web', content: 'Corporate Registry Extract', source: 'OpenCorporates', timestamp: new Date().toISOString(), confidence: 1.0 },
]

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)

  // Analyst Console Data State
  const [analystData, setAnalystData] = useState<{
      entities: AnalystEntity[];
      links: AnalystLink[];
      events: AnalystEvent[];
      locations: AnalystLocation[];
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!id) return

      setLoading(true)
      try {
        // Load Case Data
        try {
            const data = await casesApi.getCase(id)
            setCaseData(data)
        } catch {
            setCaseData(getMockCase(id))
        }

        // Load Tasks
        try {
            const data = await casesApi.getTasks(id)
            setTasks(data)
        } catch {
            setTasks(getMockTasks(id))
        }

        // Load Evidence
        try {
            const data = await casesApi.getEvidence(id)
            setEvidence(data)
        } catch {
            setEvidence(getMockEvidence(id))
        }

        // Load Analyst Console Data via Typed API Clients
        try {
            // Parallel fetch
            const [graphRes, eventsRes, locationsRes] = await Promise.all([
                graphApi.getGraphForCase(id).catch(() => null),
                analyticsApi.getEventsForCase(id).catch(() => null),
                analyticsApi.getLocationsForCase(id).catch(() => null)
            ]);

            // Transform or use mock if API fails/returns empty (since backend is likely not running)
            if (graphRes && eventsRes && locationsRes) {
                 setAnalystData({
                    entities: graphRes.data.entities as AnalystEntity[],
                    links: graphRes.data.links as AnalystLink[],
                    events: eventsRes.data as AnalystEvent[],
                    locations: locationsRes.data as AnalystLocation[]
                 });
            } else {
                 // Fallback to mock data if API is not available
                 console.warn("Analyst API unavailable, using mock data for demonstration");
                 const mockAnalystData = generateMockDataset({
                    entityCount: 30,
                    linkCount: 45,
                    eventCount: 50,
                    locationCount: 20
                 });
                 setAnalystData(mockAnalystData);
            }

        } catch (apiErr) {
            console.error("Failed to load analyst data from API", apiErr);
             const mockAnalystData = generateMockDataset({
                entityCount: 30,
                linkCount: 45,
                eventCount: 50,
                locationCount: 20
            });
            setAnalystData(mockAnalystData);
        }

      } catch (err) {
        console.error('Failed to load case data', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!caseData) {
    return <EmptyState title="Case not found" />
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
        <Tabs defaultValue="analysis" className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-none border-b bg-card px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Link to="/cases">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                {caseData.title}
                                <Badge variant="outline">{caseData.id}</Badge>
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" /> {caseData.assignee}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Created {new Date(caseData.createdAt).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Updated {new Date(caseData.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={caseData.status === 'open' ? 'bg-blue-500' : 'bg-purple-500'}>
                            {caseData.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="border-red-500 text-red-500">
                            {caseData.priority.toUpperCase()} PRIORITY
                        </Badge>
                    </div>
                </div>

                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analysis">Analyst Workbench</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
                </TabsList>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full overflow-y-auto p-6 m-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Case Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{caseData.description}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analysis" className="h-full m-0">
                    {analystData ? (
                        <AnalystConsole
                            entities={analystData.entities}
                            links={analystData.links}
                            events={analystData.events}
                            locations={analystData.locations}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tasks" className="h-full overflow-y-auto p-6 m-0">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {tasks.map(task => (
                            <Card key={task.id} className="flex flex-row items-center p-4">
                                <div className={`w-3 h-3 rounded-full mr-4 ${task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                <div className="flex-1">
                                    <h4 className="font-semibold">{task.title}</h4>
                                    <p className="text-sm text-muted-foreground">{task.description}</p>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                    <div>{task.assignee}</div>
                                    <div>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}</div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="evidence" className="h-full overflow-y-auto p-6 m-0">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {evidence.map(item => (
                            <Card key={item.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary">{item.type}</Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <CardTitle className="text-base mt-2">{item.content}</CardTitle>
                                    <CardDescription>Source: {item.source}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm">
                                        Confidence: {Math.round(item.confidence * 100)}%
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                </TabsContent>
            </div>
        </Tabs>
    </div>
  )
}
