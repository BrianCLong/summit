"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphCanvas = void 0;
const react_1 = __importDefault(require("react"));
const GraphCanvas = ({ nodes, edges }) => {
    return (<div className="intelgraph-canvas border p-4 h-96 bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">
        Graph Canvas (Mock Rendering)<br />
        Nodes: {nodes.length} | Edges: {edges.length}
      </p>
    </div>);
};
exports.GraphCanvas = GraphCanvas;
