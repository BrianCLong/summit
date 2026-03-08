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
exports.SemanticSearchView = void 0;
// conductor-ui/frontend/src/views/tools/SemanticSearchView.tsx
const react_1 = __importStar(require("react"));
const semanticSearch = async (query) => {
    const res = await fetch('/api/knowledge/query/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language_query: query }),
    });
    return res.json();
};
const SemanticSearchView = () => {
    const [query, setQuery] = (0, react_1.useState)('What is our strategy for PII?');
    const [results, setResults] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleSearch = async () => {
        setIsLoading(true);
        const res = await semanticSearch(query);
        setResults(res.results || []);
        setIsLoading(false);
    };
    return (<div>
      <h1>Semantic Search</h1>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '400px' }}/>
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Ask'}
      </button>
      <div>
        {results.map((r, i) => (<div key={i} style={{
                border: '1px solid #eee',
                padding: '8px',
                margin: '8px 0',
            }}>
            <strong>
              {r.path} (Score: {r.score.toFixed(2)})
            </strong>
            <p>{r.summary}</p>
          </div>))}
      </div>
    </div>);
};
exports.SemanticSearchView = SemanticSearchView;
