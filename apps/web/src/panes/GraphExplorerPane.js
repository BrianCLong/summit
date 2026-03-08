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
const GraphExplorer = () => {
    const [cypher, setCypher] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)(null);
    const handleQuery = async () => {
        try {
            const res = await fetch('/api/intelgraph/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dsl: { start: { type: 'Actor' } } }) // Mock DSL
            });
            const data = await res.json();
            setResults(data);
        }
        catch (e) {
            console.error(e);
        }
    };
    return (<div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">IntelGraph Explorer</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={handleQuery} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">
            Load All Actors (Test DSL)
        </button>
      </div>
      <div className="bg-gray-800 p-4 rounded">
          <pre>{JSON.stringify(results, null, 2)}</pre>
      </div>
    </div>);
};
exports.default = GraphExplorer;
