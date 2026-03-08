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
exports.GraphPane = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const store_1 = require("./store");
const GraphPane = () => {
    const { timeRange, streaming, startStream, stopStream, nodes, edges, error, } = (0, store_1.useAnalysisStore)();
    (0, react_1.useEffect)(() => {
        startStream();
        return () => stopStream();
    }, [startStream, stopStream]);
    return (<div data-testid="graph-pane" style={{ height: '100%', position: 'relative' }}>
      <div className="flex items-center justify-between px-4 py-2 text-sm bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Streaming graph</span>
          <span className="text-slate-400">
            Window: {timeRange.start} - {timeRange.end}
          </span>
          {streaming && <span className="animate-pulse text-cyan-300">results streaming…</span>}
          {error && <span className="text-amber-300">{error}</span>}
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-cyan-600 px-3 py-1 text-white" onClick={() => startStream()}>
            Restart stream
          </button>
          <button className="rounded border border-slate-500 px-3 py-1 text-slate-100" onClick={() => stopStream()}>
            Stop
          </button>
        </div>
      </div>

      <reactflow_1.default nodes={nodes} edges={edges} fitView>
        <reactflow_1.MiniMap />
        <reactflow_1.Controls />
        <reactflow_1.Background />
      </reactflow_1.default>
    </div>);
};
exports.GraphPane = GraphPane;
exports.default = exports.GraphPane;
