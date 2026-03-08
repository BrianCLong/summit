"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GrafanaLinkCard;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const urls_1 = require("../../config/urls");
function GrafanaLinkCard() {
    const isDev = import.meta.env.DEV;
    if (!isDev)
        return null;
    const grafana = (0, urls_1.getGrafanaUrl)();
    const jaeger = (0, urls_1.getJaegerUrl)();
    if (!grafana && !jaeger)
        return null;
    return (<material_1.Card elevation={1} sx={{ p: 1, borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Typography variant="h6">Observability</material_1.Typography>
        <material_1.Typography variant="body2" color="text.secondary" paragraph>
          Quick links to Grafana and Jaeger for live metrics and traces.
        </material_1.Typography>
        <material_1.Stack direction="row" spacing={2}>
          {grafana && (<material_1.Button href={grafana} target="_blank" rel="noreferrer" variant="contained">
              Open Grafana
            </material_1.Button>)}
          {jaeger && (<material_1.Button href={jaeger} target="_blank" rel="noreferrer" variant="outlined">
              Open Jaeger
            </material_1.Button>)}
        </material_1.Stack>
      </material_1.CardContent>
    </material_1.Card>);
}
