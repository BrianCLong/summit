"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapOnly = exports.Default = void 0;
const App_1 = __importDefault(require("../App"));
const A11yHeatmapOverlay_1 = require("../components/A11yHeatmapOverlay");
const meta = {
    title: 'A11y Lab/App Shell',
    component: App_1.default,
    parameters: {
        a11y: {
            disable: false,
        },
    },
};
exports.default = meta;
exports.Default = {
    name: 'A11y Lab (heatmap on)',
    render: () => <App_1.default />,
};
exports.HeatmapOnly = {
    name: 'Heatmap overlay',
    render: () => <A11yHeatmapOverlay_1.A11yHeatmapOverlay enabled/>,
};
