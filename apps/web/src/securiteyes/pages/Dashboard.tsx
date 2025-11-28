import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestigationWorkbench } from '../components/InvestigationWorkbench';
import { RiskProfileView } from '../components/RiskProfileView';

interface Stats {
  activeIncidentsCount: number;
  recentEventsCount: number;
  highRiskCount: number;
  activeIncidents: any[];
  recentEvents: any[];
}

export const SecuriteyesDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetch for now as we don't have the full client api client set up in this context
    fetch('/securiteyes/dashboard/stats', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Simplified
        }
    })
      .then(res => res.json())
      .then(data => {
          setStats(data);
          setLoading(false);
      })
      .catch(err => {
          console.error(err);
          setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Securiteyes...</div>;
  if (!stats) return <div>Error loading data</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="w-8 h-8 text-blue-600" />
        Securiteyes Threat Intelligence
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{stats.activeIncidentsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold text-yellow-600">{stats.recentEventsCount}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>High Risk Accounts</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold text-orange-600">{stats.highRiskCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents">
          <TabsList>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="investigation">Investigation</TabsTrigger>
              <TabsTrigger value="risk">Insider Risk</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
              <Card>
                <CardHeader>
                    <CardTitle>Active Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.activeIncidents.map((inc: any) => (
                                <TableRow key={inc.id}>
                                    <TableCell>{inc.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={inc.severity === 'critical' ? 'destructive' : 'default'}>
                                            {inc.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{inc.status}</TableCell>
                                    <TableCell>{new Date(inc.createdAt).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="investigation">
              <InvestigationWorkbench />
          </TabsContent>

          <TabsContent value="risk">
              <RiskProfileView />
          </TabsContent>
      </Tabs>
    </div>
  );
};
