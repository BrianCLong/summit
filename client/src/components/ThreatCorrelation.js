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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client"); // Assuming Apollo Client is set up
const cytoscape_1 = __importDefault(require("cytoscape"));
const CORRELATE_THREATS_MUTATION = (0, client_1.gql) `
  mutation CorrelateThreats($osintInput: JSON!) {
    correlateThreats(osintInput: $osintInput) {
      prioritized_map
      confidence
      note
    }
  }
`;
const ThreatCorrelation = () => {
    const [osintData, setOsintData] = (0, react_1.useState)('');
    const [correlateThreats, { data, loading, error }] = (0, client_1.useMutation)(CORRELATE_THREATS_MUTATION);
    const cyContainer = (0, react_1.useRef)(null);
    const cyInstance = (0, react_1.useRef)(null);
    const handleSubmit = async () => {
        try {
            const parsedOsintData = JSON.parse(osintData);
            await correlateThreats({ variables: { osintInput: parsedOsintData } });
        }
        catch (e) {
            alert('Invalid JSON input for OSINT data.');
            console.error(e);
        }
    };
    (0, react_1.useEffect)(() => {
        if (data && cyContainer.current) {
            const prioritizedMap = data.correlateThreats?.prioritized_map || {};
            const keys = Object.keys(prioritizedMap);
            const elements = [
                ...keys.map((id) => ({ data: { id } })),
                ...keys.slice(1).map((id, idx) => ({
                    data: { id: `${keys[idx]}-${id}`, source: keys[idx], target: id },
                })),
            ];
            if (cyInstance.current) {
                cyInstance.current.destroy();
            }
            cyInstance.current = (0, cytoscape_1.default)({
                container: cyContainer.current,
                elements,
                layout: { name: 'grid' },
                style: [
                    {
                        selector: 'node',
                        style: { 'background-color': '#0074D9', label: 'data(id)' },
                    },
                ],
            });
            window.cy = cyInstance.current;
        }
    }, [data]);
    return (<div className="threat-correlation">
      <textarea className="w-full p-2 border rounded mb-4" rows={6} placeholder="Enter OSINT data in JSON format (e.g., { 'events': [{ 'region': '...', 'actor': '...', 'theme': '...', 'event_id': '...', 'timestamp': '...' }] })" value={osintData} onChange={(e) => setOsintData(e.target.value)}></textarea>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Correlating...' : 'Run Threat Correlation'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (<div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Correlation Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.correlateThreats, null, 2)}
          </pre>
          <div ref={cyContainer} style={{ height: 300 }}/>
        </div>)}
    </div>);
};
exports.default = ThreatCorrelation;
