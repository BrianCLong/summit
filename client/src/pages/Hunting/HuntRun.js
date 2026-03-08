"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HuntRun;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
function HuntRun() {
    const { id } = (0, react_router_dom_1.useParams)();
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `hunt_${id}`,
        mock: { id: id || 'h1', status: 'SUCCESS', detections: 12 },
        deps: [id],
    });
    return (<material_1.Card sx={{ m: 2, borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Stack direction="row" justifyContent="space-between" alignItems="center">
          <material_1.Typography variant="h6">Hunt Run — {data?.id}</material_1.Typography>
          <material_1.Chip size="small" label={data?.status} color={data?.status === 'RUNNING' ? 'warning' : 'success'}/>
        </material_1.Stack>
        <material_1.Typography sx={{ mt: 2 }}>
          Detections correlated: {data?.detections}
        </material_1.Typography>
        <material_1.Button sx={{ mt: 2 }} variant="contained">
          Re-run
        </material_1.Button>
      </material_1.CardContent>
    </material_1.Card>);
}
