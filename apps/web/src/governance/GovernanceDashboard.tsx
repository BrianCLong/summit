import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Activity } from 'lucide-react';

interface GovernanceStatus {
  status: string;
  environment: string;
  engine: string;
  checks: Record<string, string>;
}

interface GovernanceViolation {
  summary: {
    total_violations: number;
    high_severity: number;
    open_incidents: number;
  };
  events: Array<{
    id: string;
    timestamp: string;
    policy: string;
    status: string;
    details: string;
    actor: string;
  }>;
}

export function GovernanceDashboard() {
  const [status, setStatus] = useState<GovernanceStatus | null>(null);
  const [violations, setViolations] = useState<GovernanceViolation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Status
        const statusRes = await fetch('/api/governance/status');
        if (statusRes.ok) {
            const data = await statusRes.json();
            setStatus(data);
        } else {
             // Fallback for dev/demo if API not reachable
             setStatus({
                status: 'active',
                environment: 'dev',
                engine: 'PolicyEngine v1.0',
                checks: { opa_connection: 'simulated', audit_log: 'active' }
            });
        }

        // Fetch Violations
        const vioRes = await fetch('/api/governance/violations');
        if (vioRes.ok) {
            const data = await vioRes.json();
            setViolations(data);
        } else {
             setViolations({
                summary: { total_violations: 0, high_severity: 0, open_incidents: 0 },
                events: []
            });
        }

      } catch (error) {
        console.error('Failed to fetch governance data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading Governance Dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Governance & Policy Fabric</h1>
        <Badge variant={status?.status === 'active' ? 'default' : 'destructive'} className="text-lg py-1">
          {status?.status === 'active' ? <ShieldCheck className="w-5 h-5 mr-2 inline" /> : <ShieldAlert className="w-5 h-5 mr-2 inline" />}
          {status?.status?.toUpperCase() || 'UNKNOWN'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.environment?.toUpperCase() || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Engine: {status?.engine}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violations (All Time)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violations?.summary?.total_violations || 0}</div>
            <p className="text-xs text-muted-foreground">High Severity: {violations?.summary?.high_severity || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violations?.summary?.open_incidents || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Policy Events</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Policy</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {violations?.events?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No violations found</TableCell></TableRow>}
                    {violations?.events?.map((evt) => (
                        <TableRow key={evt.id}>
                            <TableCell>{new Date(evt.timestamp).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{evt.policy}</TableCell>
                            <TableCell>{evt.actor}</TableCell>
                            <TableCell>
                                <Badge variant={evt.status === 'BLOCKED' ? 'destructive' : 'secondary'}>
                                    {evt.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{evt.details}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
