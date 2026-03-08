"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResolverTop5;
const react_1 = __importDefault(require("react"));
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const x_data_grid_1 = require("@mui/x-data-grid");
const Link_1 = __importDefault(require("@mui/material/Link"));
const urls_1 = require("../../config/urls");
function ResolverTop5() {
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: 'resolver_top5',
        mock: [
            { parent: 'Query', field: 'search', avgMs: 12.3 },
            { parent: 'Mutation', field: 'updateCase', avgMs: 10.8 },
            { parent: 'Query', field: 'entity', avgMs: 9.2 },
            { parent: 'Query', field: 'path', avgMs: 8.9 },
            { parent: 'Mutation', field: 'addEvidence', avgMs: 7.1 },
        ],
        deps: [],
    });
    const cols = [
        { field: 'parent', headerName: 'Parent', flex: 1 },
        {
            field: 'field',
            headerName: 'Field',
            flex: 1,
            renderCell: (p) => {
                const op = `${p.row.parent}.${p.row.field}`;
                const base = window.__JAEGER_BASE || (0, urls_1.getJaegerUrl)() || '';
                const service = window.__JAEGER_SERVICE || 'intelgraph-dev';
                const lookback = window.__JAEGER_LOOKBACK || '1h';
                const href = `${base}/search?service=${service}&operation=${op}&lookback=${lookback}`;
                return (<Link_1.default href={href} target="_blank" rel="noreferrer" aria-label={`Open ${op} in Jaeger`}>
            {p.value}
          </Link_1.default>);
            },
        },
        {
            field: 'avgMs',
            headerName: 'Avg (ms)',
            width: 120,
            valueFormatter: (p) => p.value?.toFixed(1) ?? '0.0',
        },
    ];
    return (<div style={{ height: 320 }}>
      <x_data_grid_1.DataGrid rows={(data || []).map((r, i) => ({ id: i, ...r }))} columns={cols} density="compact" hideFooter disableRowSelectionOnClick/>
    </div>);
}
