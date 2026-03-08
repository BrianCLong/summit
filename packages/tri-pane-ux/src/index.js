"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriPaneLayout = void 0;
const react_1 = __importStar(require("react"));
const TriPaneLayout = () => {
    const [state, setState] = (0, react_1.useState)({
        selectedNodes: [],
        timeRange: [new Date(), new Date()],
        mapBounds: null,
    });
    return (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', height: '100vh' }}>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Graph</h3>
        <p>Selected: {state.selectedNodes.join(', ')}</p>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Timeline</h3>
        <p>Range: {state.timeRange[0].toISOString()} - {state.timeRange[1].toISOString()}</p>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Map</h3>
        <p>Bounds: {JSON.stringify(state.mapBounds)}</p>
      </div>
      <div style={{ gridColumn: '1 / -1', border: '1px solid #ccc', padding: '10px' }}>
        <h4>Explain this View</h4>
        <p>Lineage: Why these entities are visible (policy, lineage, topology)</p>
        <p>Metrics: Betweenness, communities</p>
        <p>What changed: Diff between saved views</p>
      </div>
    </div>);
};
exports.TriPaneLayout = TriPaneLayout;
exports.default = exports.TriPaneLayout;
