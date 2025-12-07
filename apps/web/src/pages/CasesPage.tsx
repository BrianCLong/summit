import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { casesApi } from '@/api/cases'
import type { Case } from '@/api/types'

// Mock data generator for fallback
const getMockCases = (): Case[] => [
  {
    id: 'CASE-2025-001',
    title: 'Suspicious Financial Activity - North America',
    description: 'Investigation into layered transactions across multiple shell companies in Delaware and Nevada.',
    status: 'investigating',
    priority: 'high',
    assignee: 'Alice Analyst',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CASE-2025-002',
    title: 'Disinformation Campaign - Election Cycle',
    description: 'Tracking coordinated bot network activity related to upcoming regional elections.',
    status: 'open',
    priority: 'critical',
    assignee: 'Bob Intel',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'CASE-2025-003',
    title: 'Supply Chain Anomaly - Semiconductor',
    description: 'Unexpected delays and routing changes in critical component shipments.',
    status: 'closed',
    priority: 'medium',
    assignee: 'Charlie Logistics',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true)
        // Try to fetch from API, fall back to mock data
        try {
            const data = await casesApi.listCases()
            if (data && data.length > 0) {
                 setCases(data)
            } else {
                 setCases(getMockCases())
            }
        } catch (apiError) {
            console.warn('API unavailable, using mock data', apiError)
            setCases(getMockCases())
        }
      } catch (err) {
        setError('Failed to load cases')
      } finally {
        setLoading(false)
      }
    }

    loadCases()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'investigating': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'archived': return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
      default: return 'bg-slate-500/10 text-slate-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default: return 'bg-slate-500/10 text-slate-500'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track intelligence investigations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Case
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cases..."
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Get started by creating a new investigation case."
          icon="file"
          action={{
            label: "Create Case",
            onClick: () => {}
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((caseItem) => (
            <Link key={caseItem.id} to={`/cases/${caseItem.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                        <Badge variant="outline" className="text-xs">{caseItem.id}</Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 max-w-2xl">
                        {caseItem.description}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          Assignee: {caseItem.assignee || 'Unassigned'}
                        </span>
                        <span>Updated: {new Date(caseItem.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(caseItem.status)} variant="outline">
                        {caseItem.status.toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(caseItem.priority)} variant="outline">
                        {caseItem.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
