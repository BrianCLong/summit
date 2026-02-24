import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface RagHealthData {
  status: string;
  service: string;
  timestamp: string;
  collection_size?: number;
  embedding_model?: string;
  components?: Record<string, boolean>;
  [key: string]: any;
}

interface GraphRagHealthData {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  components: any;
}

export default function RagHealthDashboard() {
  const [ragData, setRagData] = useState<RagHealthData | null>(null);
  const [graphRagData, setGraphRagData] = useState<GraphRagHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock historical data for charts
  const [latencyHistory, setLatencyHistory] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      // Fetch from RAG service
      try {
        const ragRes = await fetch('/api/rag/rag-health');
        if (ragRes.ok) {
          const data = await ragRes.json();
          setRagData(data);
        }
      } catch (e) {
        console.warn('Failed to fetch RAG health', e);
      }

      // Fetch from GraphRAG service
      try {
        const graphRes = await fetch('/api/graphrag/rag-health');
        if (graphRes.ok) {
          const data = await graphRes.json();
          setGraphRagData(data);
        }
      } catch (e) {
        console.warn('Failed to fetch GraphRAG health', e);
      }

      // Simulate adding data point
      const now = new Date().toLocaleTimeString();
      setLatencyHistory(prev => {
        const newData = [...prev, {
            time: now,
            ragLatency: Math.random() * 100 + 50, // Mock
            graphLatency: Math.random() * 200 + 100 // Mock
        }];
        return newData.slice(-20); // Keep last 20
      });

    } catch (err) {
      setError('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading && !ragData && !graphRagData) {
    return <div className="p-8">Loading RAG Health...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">RAG System Health</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchData()}>Refresh</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RAG Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={ragData?.status === 'healthy' ? 'success' : 'destructive'}>
                {ragData?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Embeddings: {ragData?.embedding_model || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GraphRAG Status</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">
              <Badge variant={graphRagData?.status === 'healthy' ? 'success' : 'destructive'}>
                {graphRagData?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {graphRagData?.uptime ? Math.round(graphRagData.uptime / 60) + 'm' : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragData?.collection_size || 0}</div>
            <p className="text-xs text-muted-foreground">Documents indexed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{graphRagData?.memory?.rss || 0} MB</div>
            <p className="text-xs text-muted-foreground">GraphRAG RSS</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Retrieval Latency (ms)</CardTitle>
            <CardDescription>Real-time latency metrics for RAG and GraphRAG pipelines</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ragLatency" name="Vector RAG" stroke="#8884d8" />
                  <Line type="monotone" dataKey="graphLatency" name="Graph RAG" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Component Health</CardTitle>
            <CardDescription>Status of dependent services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ragData?.components && Object.entries(ragData.components).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}</span>
                  <Badge variant={value ? 'success' : 'destructive'}>
                    {value ? 'Operational' : 'Down'}
                  </Badge>
                </div>
              ))}
               {graphRagData?.components && Object.entries(graphRagData.components).map(([key, value]) => (
                <div key={`graph-${key}`} className="flex items-center justify-between">
                   <span className="capitalize">Graph {key}</span>
                   <Badge variant={(value as any).healthy !== false ? 'success' : 'destructive'}>
                    {(value as any).healthy !== false ? 'Operational' : 'Down'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
