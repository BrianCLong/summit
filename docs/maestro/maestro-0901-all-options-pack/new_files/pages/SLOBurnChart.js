"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SLOBurnChart;
const react_1 = __importDefault(require("react"));
const LineTimeseries_1 = __importDefault(require("../components/charts/LineTimeseries"));
function SLOBurnChart() {
    const series = Array.from({ length: 24 }, (_, i) => ({
        x: `${i}:00`,
        y: Math.max(0, Math.round((Math.sin(i / 3) + 1) * 20)),
    }));
    return (<div className="p-6">
      <LineTimeseries_1.default title="SLO Burn (demo)" data={series} ariaLabel="SLO burn trend"/>
    </div>);
}
