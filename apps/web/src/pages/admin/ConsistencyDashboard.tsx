import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { RefreshCw, CheckCircle, AlertTriangle, Hammer } from 'lucide-react'

interface ConsistencyReport {
  investigationId: string
  tenantId: string
  postgresEntityCount: number
  neo4jEntityCount: number
  postgresRelationshipCount: number
  neo4jRelationshipCount: number
  postgresEntitiesMissingInNeo4j: string[]
  neo4jEntitiesMissingInPostgres: string[]
  postgresRelationshipsMissingInNeo4j: string[]
  neo4jRelationshipsMissingInPostgres: string[]
  status: 'clean' | 'drifted'
  timestamp: string
}

export const ConsistencyDashboard: React.FC = () => {
  const [reports, setReports] = useState<ConsistencyReport[]>([])
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState<string | null>(null)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') // Or use useAuth hook
      const res = await fetch('/api/consistency/reports', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()
      setReports(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleRepair = async (investigationId: string) => {
    setRepairing(investigationId)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/consistency/repair/${investigationId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Repair failed')
      await fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setRepairing(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Graph Consistency
          </h1>
          <p className="text-muted-foreground">
            Monitor and repair data drift between Postgres and Neo4j.
          </p>
        </div>
        <Button onClick={fetchReports} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Drifted Investigations
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'drifted').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clean Investigations
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'clean').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checked</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investigation Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investigation ID</TableHead>
                <TableHead>Entities (PG / Neo4j)</TableHead>
                <TableHead>Relationships (PG / Neo4j)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(report => (
                <TableRow key={report.investigationId}>
                  <TableCell className="font-mono text-xs">
                    {report.investigationId}
                  </TableCell>
                  <TableCell>
                    {report.postgresEntityCount} / {report.neo4jEntityCount}
                    {report.postgresEntityCount !== report.neo4jEntityCount && (
                      <span className="ml-2 text-red-500 text-xs">
                        Diff:{' '}
                        {report.postgresEntityCount - report.neo4jEntityCount}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.postgresRelationshipCount} /{' '}
                    {report.neo4jRelationshipCount}
                    {report.postgresRelationshipCount !==
                      report.neo4jRelationshipCount && (
                      <span className="ml-2 text-red-500 text-xs">
                        Diff:{' '}
                        {report.postgresRelationshipCount -
                          report.neo4jRelationshipCount}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.status === 'clean' ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Clean
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Drift Detected</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.status === 'drifted' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRepair(report.investigationId)}
                        disabled={repairing === report.investigationId}
                      >
                        <Hammer className="mr-2 h-3 w-3" />
                        {repairing === report.investigationId
                          ? 'Repairing...'
                          : 'Repair'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-4 text-muted-foreground"
                  >
                    No reports generated. Run a check or wait for the scheduled
                    job.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
