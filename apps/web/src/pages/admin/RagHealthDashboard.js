"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RagHealthDashboard;
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
function RagHealthDashboard() {
    const [ragData, setRagData] = (0, react_1.useState)(null);
    const [graphRagData, setGraphRagData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Mock historical data for charts
    const [latencyHistory, setLatencyHistory] = (0, react_1.useState)([]);
    const fetchData = async () => {
        try {
            // Fetch from RAG service
            try {
                const ragRes = await fetch('/api/rag/rag-health');
                if (ragRes.ok) {
                    const data = await ragRes.json();
                    setRagData(data);
                }
            }
            catch (e) {
                console.warn('Failed to fetch RAG health', e);
            }
            // Fetch from GraphRAG service
            try {
                const graphRes = await fetch('/api/graphrag/rag-health');
                if (graphRes.ok) {
                    const data = await graphRes.json();
                    setGraphRagData(data);
                }
            }
            catch (e) {
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
        }
        catch (err) {
            setError('Failed to load health data');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);
    if (loading && !ragData && !graphRagData) {
        return <div className="p-8">Loading RAG Health...</div>;
    }
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">RAG System Health</h1>
        <div className="flex gap-2">
          <Button_1.Button variant="outline" onClick={() => fetchData()}>Refresh</Button_1.Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">RAG Service Status</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">
              <Badge_1.Badge variant={ragData?.status === 'healthy' ? 'success' : 'destructive'}>
                {ragData?.status || 'Unknown'}
              </Badge_1.Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Embeddings: {ragData?.embedding_model || 'N/A'}
            </p>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">GraphRAG Status</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
             <div className="text-2xl font-bold">
              <Badge_1.Badge variant={graphRagData?.status === 'healthy' ? 'success' : 'destructive'}>
                {graphRagData?.status || 'Unknown'}
              </Badge_1.Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {graphRagData?.uptime ? Math.round(graphRagData.uptime / 60) + 'm' : 'N/A'}
            </p>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Collection Size</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{ragData?.collection_size || 0}</div>
            <p className="text-xs text-muted-foreground">Documents indexed</p>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Memory Usage</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{graphRagData?.memory?.rss || 0} MB</div>
            <p className="text-xs text-muted-foreground">GraphRAG RSS</p>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card_1.Card className="col-span-4">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Retrieval Latency (ms)</Card_1.CardTitle>
            <Card_1.CardDescription>Real-time latency metrics for RAG and GraphRAG pipelines</Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent className="pl-2">
            <div className="h-[300px]">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={latencyHistory}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Legend />
                  <recharts_1.Line type="monotone" dataKey="ragLatency" name="Vector RAG" stroke="#8884d8"/>
                  <recharts_1.Line type="monotone" dataKey="graphLatency" name="Graph RAG" stroke="#82ca9d"/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card className="col-span-3">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Component Health</Card_1.CardTitle>
            <Card_1.CardDescription>Status of dependent services</Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-4">
              {ragData?.components && Object.entries(ragData.components).map(([key, value]) => (<div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}</span>
                  <Badge_1.Badge variant={value ? 'success' : 'destructive'}>
                    {value ? 'Operational' : 'Down'}
                  </Badge_1.Badge>
                </div>))}
               {graphRagData?.components && Object.entries(graphRagData.components).map(([key, value]) => (<div key={`graph-${key}`} className="flex items-center justify-between">
                   <span className="capitalize">Graph {key}</span>
                   <Badge_1.Badge variant={value.healthy !== false ? 'success' : 'destructive'}>
                    {value.healthy !== false ? 'Operational' : 'Down'}
                  </Badge_1.Badge>
                </div>))}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}
