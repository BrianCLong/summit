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
exports.RunGraphView = void 0;
// conductor-ui/frontend/src/views/runs/RunGraphView.tsx
const react_1 = __importStar(require("react"));
// Mocking cytoscape, in a real app you would install this dependency.
const cytoscape = (options) => ({ destroy: () => { } });
const mockGraphData = {
    nodes: [
        { data: { id: 'n1', name: 'Start' } },
        { data: { id: 'n2', name: 'Build' } },
    ],
    edges: [{ data: { id: 'e1', source: 'n1', target: 'n2' } }],
};
const RunGraphView = ({ runId }) => {
    const cyRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // In a real app, fetch data from `/api/maestro/v1/runs/${runId}/graph`
        const cy = cytoscape({
            container: cyRef.current,
            elements: mockGraphData,
            style: [{ selector: 'node', style: { label: 'data(name)' } }],
            layout: { name: 'cose' },
        });
        return () => cy.destroy();
    }, [runId]);
    return (<div>
      <h3>Run Graph</h3>
      <div ref={cyRef} style={{ height: '400px', border: '1px solid #ccc' }}/>
    </div>);
};
exports.RunGraphView = RunGraphView;
