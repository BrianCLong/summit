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
exports.QueryStudio = void 0;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const QueryInput_1 = require("../components/QueryInput");
const CypherPreview_1 = require("../components/CypherPreview");
const ResultView_1 = require("../components/ResultView");
const SavedQueriesList_1 = require("../components/SavedQueriesList");
const QueryStudio = () => {
    const [cypher, setCypher] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [previewLoading, setPreviewLoading] = (0, react_1.useState)(false);
    const handleRunQuery = async (query) => {
        setLoading(true);
        try {
            // Mock fetch for now
            const res = await fetch('/api/query-studio/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cypher: query })
            });
            const data = await res.json();
            setResults(data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePreview = async (prompt) => {
        setPreviewLoading(true);
        try {
            // Mock fetch
            const res = await fetch('/api/query-studio/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await res.json();
            if (data.cypher) {
                setCypher(data.cypher);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setPreviewLoading(false);
        }
    };
    return (<material_1.Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <material_1.Typography variant="h4" gutterBottom>
        Query Studio
      </material_1.Typography>

      <material_1.Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        <material_1.Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <material_1.Paper sx={{ p: 2 }}>
                <QueryInput_1.QueryInput onPreview={handlePreview} loading={previewLoading}/>
            </material_1.Paper>
            <material_1.Paper sx={{ p: 2, flex: 1 }}>
                <SavedQueriesList_1.SavedQueriesList onSelect={setCypher}/>
            </material_1.Paper>
        </material_1.Grid>

        <material_1.Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <material_1.Paper sx={{ p: 2 }}>
                <CypherPreview_1.CypherPreview cypher={cypher} onChange={setCypher} onRun={handleRunQuery} loading={loading}/>
            </material_1.Paper>
            <material_1.Paper sx={{ p: 2, flex: 1, overflow: 'hidden' }}>
                <ResultView_1.ResultView results={results}/>
            </material_1.Paper>
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.QueryStudio = QueryStudio;
exports.default = exports.QueryStudio;
