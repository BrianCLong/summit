"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvestigationList;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const x_data_grid_1 = require("@mui/x-data-grid");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
function InvestigationList() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: 'inv_list',
        mock: [
            { id: 'inv1', name: 'Intrusion 2025-08-26', stage: 'COLLECT' },
            { id: 'inv2', name: 'Insider — Finance', stage: 'ANALYZE' },
        ],
    });
    const cols = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'stage', headerName: 'Stage', width: 140 },
    ];
    return (<material_1.Card sx={{ m: 2, borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <material_1.Typography variant="h6">Investigations</material_1.Typography>
          <material_1.Button variant="contained" data-testid="create-investigation-button" onClick={() => navigate('/investigations/new')}>
            Create from Template
          </material_1.Button>
        </material_1.Stack>
        <div style={{ height: 420 }}>
          <x_data_grid_1.DataGrid rows={(data || []).map((r) => ({ ...r }))} columns={cols} disableRowSelectionOnClick density="compact"/>
        </div>
      </material_1.CardContent>
    </material_1.Card>);
}
