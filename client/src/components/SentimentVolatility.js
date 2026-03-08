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
const ANALYZE_SENTIMENT_VOLATILITY_MUTATION = (0, client_1.gql) `
  mutation AnalyzeSentimentVolatility($signalsInput: JSON!) {
    analyzeSentimentVolatility(signalsInput: $signalsInput) {
      dashboard_json
      note
    }
  }
`;
const SentimentVolatility = () => {
    const [signalsData, setSignalsData] = (0, react_1.useState)('');
    const [analyzeSentimentVolatility, { data, loading, error }] = (0, client_1.useMutation)(ANALYZE_SENTIMENT_VOLATILITY_MUTATION);
    const chartRef = (0, react_1.useRef)(null);
    const handleSubmit = async () => {
        try {
            const parsedSignalsData = JSON.parse(signalsData);
            await analyzeSentimentVolatility({
                variables: { signalsInput: parsedSignalsData },
            });
        }
        catch (e) {
            alert('Invalid JSON input for signals data.');
            console.error(e);
        }
    };
    (0, react_1.useEffect)(() => {
        if (data && chartRef.current) {
            const dashboard = data.analyzeSentimentVolatility?.dashboard_json || {};
            const points = Object.entries(dashboard).map(([k, v]) => ({
                label: k,
                value: Number(v),
            }));
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
                .domain(points.map((p) => p.label))
                .range([0, width])
                .padding(0.2);
            const y = d3
                .scaleLinear()
                .domain([0, d3.max(points, (p) => p.value) || 1])
                .range([height, 0]);
            svg
                .append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
            svg.append('g').call(d3.axisLeft(y));
            svg
                .selectAll('rect')
                .data(points)
                .enter()
                .append('rect')
                .attr('x', (d) => x(d.label) || 0)
                .attr('y', (d) => y(d.value))
                .attr('width', x.bandwidth())
                .attr('height', (d) => height - y(d.value))
                .attr('fill', '#10b981');
        }
    }, [data]);
    return (<div className="sentiment-volatility">
      <textarea className="w-full p-2 border rounded mb-4" rows={6} placeholder="Enter signals data in JSON format (e.g., { 'alpha_signals': [{ 'timestamp': '...', 'volatility': '...' }], 'sentiment_data': [{ 'timestamp': '...', 'sentiment_shift': '...' }] })" value={signalsData} onChange={(e) => setSignalsData(e.target.value)}></textarea>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Run Sentiment-to-Volatility Analysis'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (<div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Analysis Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.analyzeSentimentVolatility, null, 2)}
          </pre>
          <div ref={chartRef}/>
        </div>)}
    </div>);
};
exports.default = SentimentVolatility;
