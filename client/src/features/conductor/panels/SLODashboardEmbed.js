"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLODashboardEmbed = SLODashboardEmbed;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function SLODashboardEmbed({ grafanaUrl = import.meta.env.VITE_GRAFANA_URL || '', dashboard = import.meta.env.VITE_GRAFANA_MAESTRO_DASH_UID || '', theme = 'light', }) {
    const src = dashboard && grafanaUrl
        ? `${grafanaUrl}/d/${dashboard}?kiosk&theme=${theme}`
        : '';
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          SLO Dashboard
        </material_1.Typography>
        {src ? (<material_1.Box sx={{ height: 360 }}>
            <iframe title="Grafana SLO" src={src} width="100%" height="100%" frameBorder={0}/>
          </material_1.Box>) : (<material_1.Typography variant="body2" color="text.secondary">
            Set VITE_GRAFANA_URL and VITE_GRAFANA_MAESTRO_DASH_UID to embed the
            SLO dashboard.
          </material_1.Typography>)}
      </material_1.CardContent>
    </material_1.Card>);
}
