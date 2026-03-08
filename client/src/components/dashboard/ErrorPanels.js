"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorPanels;
const react_1 = __importDefault(require("react"));
const index_1 = require("../../store/index");
const material_1 = require("@mui/material");
const x_data_grid_1 = require("@mui/x-data-grid");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
function ErrorPanels() {
    const { tenant, status, operation } = (0, index_1.useAppSelector)((s) => s.ui);
    const { data: ratio, loading } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `err_ratio_${tenant}_${status}_${operation}`,
        mock: { value: 0.0123 },
        deps: [tenant, status, operation],
    });
    const { data: topOps } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `err_top_ops_${tenant}_${status}`,
        mock: [
            { operation: 'SearchQuery', ratio: 0.034 },
            { operation: 'UpdateCase', ratio: 0.021 },
        ],
        deps: [tenant, status],
    });
    const columns = [
        { field: 'operation', headerName: 'Operation', flex: 1 },
        {
            field: 'ratio',
            headerName: 'Error Ratio',
            flex: 1,
            valueFormatter: (p) => `${(Number(p.value || 0) * 100).toFixed(2)}%`,
        },
    ];
    return (<material_1.Stack spacing={2}>
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="subtitle2" color="text.secondary">
            Error Ratio (5m) — Operation
          </material_1.Typography>
          {loading ? (<material_1.Skeleton width={140} height={40}/>) : (<material_1.Typography variant="h4">
              {(ratio?.value ?? 0).toLocaleString(undefined, {
                style: 'percent',
                minimumFractionDigits: 2,
            })}
            </material_1.Typography>)}
        </material_1.CardContent>
      </material_1.Card>
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Top Operations by Error Ratio (5m)
          </material_1.Typography>
          <div style={{ height: 260 }}>
            <x_data_grid_1.DataGrid rows={(topOps || []).map((r, i) => ({ id: i, ...r }))} columns={columns} disableRowSelectionOnClick density="compact"/>
          </div>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Stack>);
}
