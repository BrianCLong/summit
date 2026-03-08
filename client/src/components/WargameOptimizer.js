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
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const d3 = __importStar(require("d3"));
const OPTIMIZE_WARGAME_MUTATION = (0, client_1.gql) `
  mutation OptimizeWargame($logsInput: JSON!) {
    optimizeWargame(logsInput: $logsInput) {
      counter_strategies
      probabilities {
        confidence_interval
        simulated_win_rate
      }
      optimization_results {
        status
        UAV_units
        Munitions_units
        min_cost
      }
      identified_errors
      note
    }
  }
`;
const WargameOptimizer = () => {
    const [logsData, setLogsData] = (0, react_1.useState)('');
    const [optimizeWargame, { data, loading, error }] = (0, client_1.useMutation)(OPTIMIZE_WARGAME_MUTATION);
    const chartRef = (0, react_1.useRef)(null);
    const handleSubmit = async () => {
        try {
            const parsedLogsData = JSON.parse(logsData);
            await optimizeWargame({ variables: { logsInput: parsedLogsData } });
        }
        catch (e) {
            alert('Invalid JSON input for logs data.');
            console.error(e);
        }
    };
    (0, react_1.useEffect)(() => {
        if (data && chartRef.current) {
            const probs = data.optimizeWargame?.probabilities || {};
            const dataset = [
                { label: 'win_rate', value: probs.simulated_win_rate || 0 },
                { label: 'confidence', value: probs.confidence_interval || 0 },
            ];
            const width = 300;
            const height = 200;
            d3.select(chartRef.current).selectAll('*').remove();
            const svg = d3
                .select(chartRef.current)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            const x = d3
                .scaleBand()
                .domain(dataset.map((d) => d.label))
                .range([0, width])
                .padding(0.2);
            const y = d3
                .scaleLinear()
                .domain([0, d3.max(dataset, (d) => d.value) || 1])
                .range([height, 0]);
            svg
                .append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
            svg.append('g').call(d3.axisLeft(y));
            svg
                .selectAll('rect')
                .data(dataset)
                .enter()
                .append('rect')
                .attr('x', (d) => x(d.label) || 0)
                .attr('y', (d) => y(d.value))
                .attr('width', x.bandwidth())
                .attr('height', (d) => height - y(d.value))
                .attr('fill', '#3b82f6');
        }
    }, [data]);
    return (<div className="wargame-optimizer">
      <textarea className="w-full p-2 border rounded mb-4" rows={6} placeholder="Enter simulation logs in JSON format (e.g., { 'simulations': [{ 'outcome': '...', 'error_type': '...' }] })" value={logsData} onChange={(e) => setLogsData(e.target.value)}></textarea>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Optimizing...' : 'Run Wargame Optimizer'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (<div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Optimization Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.optimizeWargame, null, 2)}
          </pre>
          <div ref={chartRef}/>
        </div>)}
    </div>);
};
exports.default = WargameOptimizer;
