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
const ANALYZE_STEGO_MUTATION = (0, client_1.gql) `
  mutation AnalyzeStego($mediaDataInput: JSON!) {
    analyzeStego(mediaDataInput: $mediaDataInput) {
      risk_matrix
      recommendations
      entropy
      simulated_dct_diffs_mean
      note
    }
  }
`;
const MatrixGraph = ({ matrix }) => {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!ref.current || !matrix || matrix.length === 0)
            return;
        const numRows = matrix.length;
        const numCols = matrix[0].length;
        const cellSize = 30;
        const width = cellSize * numCols;
        const height = cellSize * numRows;
        const container = d3.select(ref.current);
        container.selectAll('*').remove();
        const svg = container
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        const x = d3
            .scaleBand()
            .domain(d3.range(numCols).map(String))
            .range([0, width]);
        const y = d3
            .scaleBand()
            .domain(d3.range(numRows).map(String))
            .range([0, height]);
        const maxValue = d3.max(matrix.flat()) ?? 0;
        const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]);
        const tooltip = container
            .append('div')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', '#fff')
            .style('padding', '4px 8px')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px')
            .style('font-size', '12px');
        svg
            .selectAll('g')
            .data(matrix)
            .enter()
            .append('g')
            .attr('transform', (d, i) => `translate(0,${y(String(i))})`)
            .selectAll('rect')
            .data((row, i) => row.map((value, j) => ({ value, row: i, col: j })))
            .enter()
            .append('rect')
            .attr('x', (d) => x(String(d.col)))
            .attr('y', 0)
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', (d) => color(d.value))
            .on('mouseover', (_event, d) => {
            tooltip
                .style('visibility', 'visible')
                .text(`Encoded ${d.row}, Decoded ${d.col}: ${d.value}`);
        })
            .on('mousemove', (event) => {
            tooltip
                .style('top', `${event.pageY - 10}px`)
                .style('left', `${event.pageX + 10}px`);
        })
            .on('mouseout', () => tooltip.style('visibility', 'hidden'));
    }, [matrix]);
    return <div ref={ref} className="relative"/>;
};
const StegoAnalyzer = () => {
    const [mediaData, setMediaData] = (0, react_1.useState)('');
    const [stegoParams, setStegoParams] = (0, react_1.useState)('');
    const [analyzeStego, { data, loading, error }] = (0, client_1.useMutation)(ANALYZE_STEGO_MUTATION);
    const handleSubmit = async () => {
        try {
            const parsedMediaData = mediaData.trim();
            if (!parsedMediaData) {
                throw new Error('Media data cannot be empty.');
            }
            const parsedStegoParams = stegoParams
                ? JSON.parse(stegoParams)
                : {};
            await analyzeStego({
                variables: {
                    mediaDataInput: { data: parsedMediaData, params: parsedStegoParams },
                },
            });
        }
        catch (e) {
            const message = e instanceof Error
                ? e.message
                : 'Invalid input. Media data should be base64 string, params should be JSON.';
            alert(message);
            console.error(e);
        }
    };
    return (<div className="stego-analyzer">
      <textarea className="w-full p-2 border rounded mb-4" rows={6} placeholder="Enter media data (e.g., base64 encoded image string)" value={mediaData} onChange={(e) => setMediaData(e.target.value)}></textarea>
      <textarea className="w-full p-2 border rounded mb-4" rows={3} placeholder="Enter optional parameters in JSON format (e.g., { 'scan_type': 'full' })" value={stegoParams} onChange={(e) => setStegoParams(e.target.value)}></textarea>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Run Steganographic Analysis'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {(() => {
            const analysis = data
                ?.analyzeStego;
            const riskMatrix = Array.isArray(analysis?.risk_matrix)
                ? analysis.risk_matrix
                : null;
            if (!analysis)
                return null;
            return (<div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Analysis Results:</h3>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(analysis, null, 2)}
            </pre>
            {riskMatrix && (<div className="mt-4">
                <h4 className="font-semibold mb-2">Encoded vs Decoded Matrix</h4>
                <MatrixGraph matrix={riskMatrix}/>
              </div>)}
          </div>);
        })()}
    </div>);
};
exports.default = StegoAnalyzer;
