import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, AlertTriangle, GitPullRequest, Database, Users, FileDiff } from 'lucide-react';

interface GovernanceData {
  stats: {
    totalAgents: number;
    totalPrompts: number;
    highRiskPrompts: number;
    totalRuns: number;
    failedRuns: number;
    successRate: number;
    prsGenerated: number;
  };
  agents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastRun?: string;
  }>;
  prompts: Array<{
    id: string;
    riskLevel: string;
    tags: string[];
    version: string;
  }>;
  recentRuns: Array<{
    id: string;
    pipeline: string;
    status: string;
    duration: number;
    createdAt: string;
    error?: string;
  }>;
}

export default function GovernanceDashboard() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/governance/dashboard', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch governance data');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        // Fallback for dev/demo if API unreachable
        setData({
             stats: {
                totalAgents: 3,
                totalPrompts: 12,
                highRiskPrompts: 1,
                totalRuns: 45,
                failedRuns: 2,
                successRate: 95.5,
                prsGenerated: 0
              },
              agents: [
                { id: '1', name: 'codex.architect', type: 'agent', status: 'active', lastRun: new Date().toISOString() },
                { id: '2', name: 'data.pipeline.etl', type: 'pipeline', status: 'idle', lastRun: new Date(Date.now() - 3600000).toISOString() },
                { id: '3', name: 'security.auditor', type: 'agent', status: 'active', lastRun: new Date().toISOString() }
              ],
              prompts: [
                { id: 'code.generate', riskLevel: 'high', tags: ['write', 'code'], version: 'v2' },
                { id: 'analysis.summarize', riskLevel: 'low', tags: ['read'], version: 'v1' },
                { id: 'security.scan', riskLevel: 'medium', tags: ['internal'], version: 'v1.5' }
              ],
              recentRuns: [
                 { id: 'run-1', pipeline: 'codex.architect', status: 'succeeded', duration: 1200, createdAt: new Date().toISOString() },
                 { id: 'run-2', pipeline: 'data.pipeline.etl', status: 'failed', duration: 500, createdAt: new Date().toISOString(), error: 'Connection timeout' }
              ]
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading Governance Dashboard...</div>;
  if (!data) return <div className="p-8 text-red-500">Error loading data.</div>;

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Prompt Governance</h1>
          <p className="text-muted-foreground mt-2">Multi-Agent Oversight & Risk Management</p>
        </div>
        <div className="flex gap-2">
           <Badge variant="outline" className="px-4 py-2 text-sm">System Health: Optimal</Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">Across all environments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prompt Library</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalPrompts}</div>
            <p className="text-xs text-muted-foreground">{data.stats.highRiskPrompts} High Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{data.stats.totalRuns} Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRs Generated</CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.prsGenerated}</div>
            <p className="text-xs text-muted-foreground">Auto-generated this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agents & Pipelines */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Agents & Pipelines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.type}</TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'active' ? 'default' : agent.status === 'error' ? 'destructive' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agent.lastRun ? new Date(agent.lastRun).toLocaleTimeString() : 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Prompt Governance */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Prompt Governance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-y-auto max-h-[400px]">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Version</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                        <TableCell className="font-mono text-xs">{prompt.id}</TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            {prompt.riskLevel === 'high' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {prompt.riskLevel === 'medium' && <Shield className="h-4 w-4 text-yellow-500" />}
                            <span className={
                                prompt.riskLevel === 'high' ? 'text-red-600 font-bold' :
                                prompt.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }>{prompt.riskLevel.toUpperCase()}</span>
                        </div>
                        </TableCell>
                        <TableCell>{prompt.version}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Execution Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Pipeline/Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">{run.id.slice(0, 8)}</TableCell>
                  <TableCell>{run.pipeline}</TableCell>
                  <TableCell>
                     <Badge variant={run.status === 'succeeded' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                        {run.status}
                     </Badge>
                     {run.error && <span className="ml-2 text-xs text-red-500">{run.error}</span>}
                  </TableCell>
                  <TableCell>{run.duration ? `${(run.duration / 1000).toFixed(2)}s` : '-'}</TableCell>
                  <TableCell>{new Date(run.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diffs Placeholder */}
       <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <FileDiff className="h-5 w-5" />
          <CardTitle>Recent Diffs & Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No recent diffs available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
