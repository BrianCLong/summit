"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IOCDetail;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
function IOCDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const { data } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `ioc_${id}`,
        mock: {
            id: id || 'ioc1',
            type: 'ip',
            value: '1.2.3.4',
            lastSeen: new Date().toISOString(),
        },
        deps: [id],
    });
    return (<material_1.Card sx={{ m: 2, borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Typography variant="h6">IOC — {data?.id}</material_1.Typography>
        <material_1.Typography>Type: {data?.type}</material_1.Typography>
        <material_1.Typography>Value: {data?.value}</material_1.Typography>
        <material_1.Typography>
          Last Seen: {new Date(data?.lastSeen || Date.now()).toLocaleString()}
        </material_1.Typography>
      </material_1.CardContent>
    </material_1.Card>);
}
