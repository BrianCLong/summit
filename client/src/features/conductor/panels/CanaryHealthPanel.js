"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryHealthPanel = CanaryHealthPanel;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
function CanaryHealthPanel({ availability = 0.0, p95TtfbMs = 0, errorRate = 0.0, target = 'https://maestro.example/health', }) {
    const availColor = availability >= 0.99
        ? 'success'
        : availability >= 0.95
            ? 'warning'
            : 'error';
    const p95Color = p95TtfbMs < 1500 ? 'success' : p95TtfbMs < 2500 ? 'warning' : 'error';
    const errColor = errorRate < 0.01 ? 'success' : errorRate < 0.05 ? 'warning' : 'error';
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          Canary Health (Blackbox): {target}
        </material_1.Typography>
        <Grid_1.default container spacing={2}>
          <Grid_1.default xs={12} sm={4}>
            <material_1.Typography variant="body2" color="text.secondary">
              Availability (avg 5m)
            </material_1.Typography>
            <material_1.Chip label={`${(availability * 100).toFixed(2)}%`} color={availColor}/>
          </Grid_1.default>
          <Grid_1.default xs={12} sm={4}>
            <material_1.Typography variant="body2" color="text.secondary">
              p95 TTFB
            </material_1.Typography>
            <material_1.Chip label={`${Math.round(p95TtfbMs)} ms`} color={p95Color}/>
          </Grid_1.default>
          <Grid_1.default xs={12} sm={4}>
            <material_1.Typography variant="body2" color="text.secondary">
              5xx Error Rate
            </material_1.Typography>
            <material_1.Chip label={`${(errorRate * 100).toFixed(2)}%`} color={errColor}/>
          </Grid_1.default>
        </Grid_1.default>
      </material_1.CardContent>
    </material_1.Card>);
}
