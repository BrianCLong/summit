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
exports.ExpertFinder = void 0;
// conductor-ui/frontend/src/components/knowledge/ExpertFinder.tsx
const react_1 = __importStar(require("react"));
const findExpert = async (filePath) => {
    const res = await fetch('/api/knowledge/query/structural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            structural_query: { type: 'find_owner', path: filePath },
        }),
    });
    return res.json();
};
const ExpertFinder = () => {
    const [filePath, setFilePath] = (0, react_1.useState)('services/lsc-service/src/index.ts');
    const [result, setResult] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleFind = async () => {
        setIsLoading(true);
        const res = await findExpert(filePath);
        setResult(res);
        setIsLoading(false);
    };
    return (<div>
      <h4>Expert Finder</h4>
      <input type="text" value={filePath} onChange={(e) => setFilePath(e.target.value)} style={{ width: '300px' }}/>
      <button onClick={handleFind} disabled={isLoading}>
        {isLoading ? 'Finding...' : 'Find Expert'}
      </button>
      {result && (<div>
          <p>
            <strong>Suggested Owner:</strong> {result.results[0].owner}
          </p>
          <p>
            <strong>Reasoning:</strong> {result.results[0].reasoning}
          </p>
        </div>)}
    </div>);
};
exports.ExpertFinder = ExpertFinder;
