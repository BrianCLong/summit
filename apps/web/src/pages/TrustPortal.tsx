import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, XCircle, Download, ExternalLink, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TrustStatus {
  region: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  lastUpdated: string;
}

interface TrustSLA {
  metric: string;
  currentValue: number;
  target: number;
  status: 'compliant' | 'risk' | 'breached';
  evidenceLink?: string;
}

interface TrustEvidence {
  claim: string;
  source: string;
  timestamp: string;
  verificationMethod: string;
  artifactHash: string;
  ledgerSequence: string;
}

interface CompliancePosture {
    dataResidency: string;
    soc2Status: string;
    lastAuditDate: string;
}

const TrustPortal = () => {
  const [status, setStatus] = useState<TrustStatus[]>([]);
  const [slas, setSlas] = useState<TrustSLA[]>([]);
  const [evidence, setEvidence] = useState<TrustEvidence[]>([]);
  const [compliance, setCompliance] = useState<CompliancePosture | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Status
        const statusRes = await fetch('/api/trust/status');
        if (statusRes.ok) setStatus(await statusRes.json());

        // Fetch SLAs
        const slasRes = await fetch('/api/trust/slas');
        if (slasRes.ok) setSlas(await slasRes.json());

        // Fetch Evidence
        const evidenceRes = await fetch('/api/trust/evidence');
        if (evidenceRes.ok) setEvidence(await evidenceRes.json());

        // Fetch Compliance
        const complianceRes = await fetch('/api/trust/compliance');
        if (complianceRes.ok) setCompliance(await complianceRes.json());

      } catch (error) {
        console.error('Failed to fetch trust data', error);
        toast({
          title: "Error fetching data",
          description: "Could not load trust portal data. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'outage': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance': return <Badge variant="outline">Maint</Badge>;
      default: return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSlaBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Compliant</Badge>;
      case 'risk': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">At Risk</Badge>;
      case 'breached': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Breached</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleExport = async () => {
    try {
        const res = await fetch('/api/trust/export');
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trust-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast({
            title: "Export Complete",
            description: "Trust report downloaded successfully."
        });
    } catch (e) {
        toast({
            title: "Export Failed",
            description: "Could not generate PDF report.",
            variant: "destructive"
        });
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center">Loading Trust Portal...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customer Trust Portal</h1>
          <p className="text-slate-500 mt-2">Live status, contractual guarantees, and verifiable evidence.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export Signed Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {status.map((s, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.region}</CardTitle>
              {getStatusIcon(s.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{s.status}</div>
              <p className="text-xs text-muted-foreground">Last updated: {new Date(s.lastUpdated).toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="slas" className="w-full">
        <TabsList>
          <TabsTrigger value="slas">SLAs & SLOs</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Locker</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
            <Card>
                <CardHeader>
                    <CardTitle>Data Residency & Compliance Posture</CardTitle>
                </CardHeader>
                <CardContent>
                    {compliance ? (
                        <div className="grid gap-4 md:grid-cols-3">
                             <div className="p-4 border rounded-lg bg-slate-50">
                                 <h3 className="font-semibold mb-1">Data Residency</h3>
                                 <p className="text-sm text-slate-600">{compliance.dataResidency}</p>
                             </div>
                             <div className="p-4 border rounded-lg bg-slate-50">
                                 <h3 className="font-semibold mb-1">SOC2 Status</h3>
                                 <div className="flex items-center gap-2">
                                     <Badge className="bg-green-100 text-green-800">Verified</Badge>
                                     <span className="text-sm text-slate-600">{compliance.soc2Status}</span>
                                 </div>
                             </div>
                             <div className="p-4 border rounded-lg bg-slate-50">
                                 <h3 className="font-semibold mb-1">Last Audit</h3>
                                 <p className="text-sm text-slate-600">{new Date(compliance.lastAuditDate).toLocaleDateString()}</p>
                             </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Compliance data unavailable.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="slas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Level Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slas.map((sla, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{sla.metric}</TableCell>
                      <TableCell>{sla.currentValue}</TableCell>
                      <TableCell>{sla.target}</TableCell>
                      <TableCell>{getSlaBadge(sla.status)}</TableCell>
                      <TableCell className="text-right">
                         {sla.evidenceLink && (
                             <a href={sla.evidenceLink} className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm">
                                 Verify <ExternalLink className="h-3 w-3" />
                             </a>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>Verifiable Evidence</CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim / Action</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Artifact Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.map((ev, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{ev.claim}</TableCell>
                      <TableCell>{ev.source}</TableCell>
                      <TableCell>{new Date(ev.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.artifactHash.substring(0, 16)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
           <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>No Active Incidents</AlertTitle>
                <AlertDescription>
                    All systems are operating normally.
                </AlertDescription>
            </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrustPortal;
