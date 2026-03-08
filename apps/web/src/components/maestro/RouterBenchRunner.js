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
exports.default = RouterBenchRunner;
// =============================================
// Router Bench Runner & Performance Analysis
// =============================================
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
const recharts_1 = require("recharts");
// Mock API functions
const mockPostRoutingBench = async (payload) => {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // Simulate variable bench time
    const results = payload.models.map(model => ({
        model,
        score: Math.random() * 0.4 + 0.6, // 0.6-1.0
        usd: (payload.tokens / 1000) * (0.05 + Math.random() * 0.7), // Variable cost per 1k tokens
        p95: Math.floor(500 + Math.random() * 1500), // 500-2000ms
        throughput: Math.floor(50 + Math.random() * 200), // 50-250 requests/min
        errorRate: Math.random() * 0.1, // 0-10% error rate
    }));
    return {
        route: payload.route,
        tokens: payload.tokens,
        results: results.sort((a, b) => b.score - a.score),
    };
};
const mockGetRoutingPerf = async (route) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const now = Date.now();
    const points = Array.from({ length: 24 }, (_, i) => ({
        ts: now - (23 - i) * 3600000, // Last 24 hours
        p95: 600 + Math.sin(i * 0.3) * 200 + Math.random() * 100, // Some pattern + noise
        throughput: 120 + Math.cos(i * 0.4) * 40 + Math.random() * 20,
        errorRate: Math.max(0, 0.02 + Math.sin(i * 0.2) * 0.01 + (Math.random() - 0.5) * 0.02),
    }));
    return { route, points };
};
function RouterBenchRunner() {
    const [route, setRoute] = (0, react_1.useState)('codegen');
    const [models, setModels] = (0, react_1.useState)('gpt-4o-mini,claude-3-haiku,qwen2.5-coder:14b');
    const [tokens, setTokens] = (0, react_1.useState)(1500);
    const [currentBench, setCurrentBench] = (0, react_1.useState)(null);
    const [perfData, setPerfData] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [perfLoading, setPerfLoading] = (0, react_1.useState)(false);
    // Load performance data when route changes
    (0, react_1.useEffect)(() => {
        const loadPerf = async () => {
            setPerfLoading(true);
            try {
                const data = await mockGetRoutingPerf(route);
                setPerfData(data.points);
            }
            finally {
                setPerfLoading(false);
            }
        };
        loadPerf();
    }, [route]);
    const runBenchmark = async () => {
        setLoading(true);
        const startTime = Date.now();
        try {
            const modelList = models
                .split(',')
                .map(m => m.trim())
                .filter(Boolean);
            if (modelList.length === 0) {
                alert('Please specify at least one model');
                return;
            }
            const result = await mockPostRoutingBench({
                route,
                models: modelList,
                tokens,
            });
            const duration = Date.now() - startTime;
            const benchmark = {
                route,
                tokens,
                results: result.results,
                timestamp: new Date(),
                duration,
            };
            setCurrentBench(benchmark);
        }
        catch (error) {
            alert(`Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            setLoading(false);
        }
    };
    const getBestModel = (results) => {
        if (results.length === 0)
            return null;
        return results.reduce((best, current) => current.score > best.score ? current : best);
    };
    const formatPerfData = perfData.map(point => ({
        time: new Date(point.ts).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        p95: Math.round(point.p95),
        throughput: Math.round(point.throughput),
        errorRate: (point.errorRate * 100).toFixed(2),
    }));
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <outline_1.ChartBarIcon className="h-6 w-6 text-blue-600"/>
        <h2 className="text-lg font-medium text-gray-900">
          Router Bench & Performance
        </h2>
      </div>

      {/* Benchmark Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          Run Benchmark
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route
            </label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g., codegen"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Models (comma-separated)
            </label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={models} onChange={e => setModels(e.target.value)} placeholder="model1,model2,model3"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Count
            </label>
            <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={tokens} onChange={e => setTokens(Number(e.target.value))} min="1"/>
          </div>
        </div>

        <button onClick={runBenchmark} disabled={loading} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          <outline_1.PlayIcon className="h-4 w-4 mr-2"/>
          {loading ? 'Running Benchmark...' : 'Run Benchmark'}
        </button>

        {loading && (<div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"/>
            <span>
              Testing {models.split(',').length} models across multiple
              metrics...
            </span>
          </div>)}
      </div>

      {/* Current Benchmark Results */}
      {currentBench && (<div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-900">
              Latest Benchmark Results
            </h3>
            <div className="text-sm text-gray-600">
              {currentBench.timestamp.toLocaleString()} •{' '}
              {(currentBench.duration / 1000).toFixed(1)}s
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <outline_1.TrophyIcon className="h-5 w-5 text-green-600"/>
                <span className="text-sm font-medium text-green-900">
                  Best Model
                </span>
              </div>
              <div className="text-lg font-bold text-green-900 mt-1">
                {getBestModel(currentBench.results)?.model || 'N/A'}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <outline_1.CurrencyDollarIcon className="h-5 w-5 text-blue-600"/>
                <span className="text-sm font-medium text-blue-900">
                  Avg Cost
                </span>
              </div>
              <div className="text-lg font-bold text-blue-900 mt-1">
                $
                {(currentBench.results.reduce((sum, r) => sum + r.usd, 0) /
                currentBench.results.length).toFixed(3)}
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <outline_1.ClockIcon className="h-5 w-5 text-purple-600"/>
                <span className="text-sm font-medium text-purple-900">
                  Avg P95
                </span>
              </div>
              <div className="text-lg font-bold text-purple-900 mt-1">
                {Math.round(currentBench.results.reduce((sum, r) => sum + r.p95, 0) /
                currentBench.results.length)}
                ms
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <outline_1.ExclamationTriangleIcon className="h-5 w-5 text-red-600"/>
                <span className="text-sm font-medium text-red-900">
                  Max Error
                </span>
              </div>
              <div className="text-lg font-bold text-red-900 mt-1">
                {(Math.max(...currentBench.results.map(r => r.errorRate)) * 100).toFixed(1)}
                %
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost (USD)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P95 Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Throughput
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBench.results.map((result, index) => (<tr key={result.model} className={index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {result.model}
                        </span>
                        {index === 0 && (<outline_1.TrophyIcon className="h-4 w-4 text-yellow-500 ml-2" title="Best overall"/>)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${result.score * 100}%` }}/>
                        </div>
                        <span className="text-sm text-gray-900">
                          {result.score.toFixed(3)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${result.usd.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.p95}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.throughput}/min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${result.errorRate < 0.01
                    ? 'text-green-600'
                    : result.errorRate < 0.05
                        ? 'text-yellow-600'
                        : 'text-red-600'}`}>
                        {(result.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* Performance Over Time */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-gray-900">
            Performance Over Time
          </h3>
          <div className="text-sm text-gray-600">
            Route: {route} • Last 24 hours
            {perfLoading && (<span className="ml-2 text-blue-600">Loading...</span>)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P95 Latency Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              P95 Latency
            </h4>
            <div className="h-48">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={formatPerfData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time" tick={{ fontSize: 10 }}/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip formatter={value => [`${value}ms`, 'P95 Latency']}/>
                  <recharts_1.Line type="monotone" dataKey="p95" stroke="#8B5CF6" strokeWidth={2} dot={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>
          </div>

          {/* Throughput Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Throughput
            </h4>
            <div className="h-48">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={formatPerfData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="time" tick={{ fontSize: 10 }}/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip formatter={value => [`${value}/min`, 'Throughput']}/>
                  <recharts_1.Line type="monotone" dataKey="throughput" stroke="#10B981" strokeWidth={2} dot={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Performance Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Avg P95:</span>
              <span className="ml-2 text-blue-700">
                {Math.round(perfData.reduce((sum, p) => sum + p.p95, 0) / perfData.length)}
                ms
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">
                Peak Throughput:
              </span>
              <span className="ml-2 text-blue-700">
                {Math.round(Math.max(...perfData.map(p => p.throughput)))}/min
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Avg Error Rate:</span>
              <span className="ml-2 text-blue-700">
                {((perfData.reduce((sum, p) => sum + p.errorRate, 0) /
            perfData.length) *
            100).toFixed(2)}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
