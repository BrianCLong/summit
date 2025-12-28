import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

interface AssuranceSignal {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'AT_RISK';
  lastVerified: string;
  owner: string;
  reason?: string;
}

interface AssuranceResult {
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL' | 'AT_RISK';
  signals: AssuranceSignal[];
}

const StatusBadge = ({ status }: { status: AssuranceSignal['status'] }) => {
  switch (status) {
    case 'PASS':
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> PASS</Badge>;
    case 'FAIL':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> FAIL</Badge>;
    case 'AT_RISK':
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" /> AT RISK</Badge>;
    default:
      return <Badge variant="secondary">UNKNOWN</Badge>;
  }
};

export const AssuranceDashboard: React.FC = () => {
  const [data, setData] = useState<AssuranceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/assurance/status');
        if (!response.ok) {
          throw new Error('Failed to fetch assurance data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error loading assurance status: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Continuous Assurance Status</h1>
          <p className="text-muted-foreground">Real-time verification of Summit's critical guarantees.</p>
        </div>
        <div className="flex flex-col items-end text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium">Overall Status:</span>
            <StatusBadge status={data.overallStatus} />
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Last Verified: {new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.signals.map((signal) => (
          <Card key={signal.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium leading-normal">
                {signal.name}
              </CardTitle>
              <StatusBadge status={signal.status} />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mt-2 space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>ID:</span>
                  <span className="font-mono">{signal.id}</span>
                </div>
                 <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Owner:</span>
                  <span>{signal.owner}</span>
                </div>
                {signal.reason && (
                  <div className="pt-2">
                    <span className="font-semibold block mb-1">Status Reason:</span>
                    <p className="opacity-90">{signal.reason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
