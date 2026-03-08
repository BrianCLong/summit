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
exports.NeighborhoodStreaming = NeighborhoodStreaming;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function NeighborhoodStreaming({ nodeId, onNodesReceived, maxDepth = 2, batchLimit = 50, }) {
    const [isStreaming, setIsStreaming] = (0, react_1.useState)(false);
    const [streamStats, setStreamStats] = (0, react_1.useState)({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    const [progress, setProgress] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!isStreaming)
            return;
        let processed = 0;
        const totalBatches = batchLimit * Math.max(maxDepth, 1);
        setProgress({
            processed,
            total: totalBatches,
            percentage: 0,
            eta: totalBatches,
        });
        const interval = setInterval(() => {
            const nodes = Array.from({ length: Math.max(1, Math.floor(Math.random() * batchLimit)) }, (_, idx) => ({
                id: `${nodeId}-node-${Date.now()}-${idx}`,
                type: ['person', 'organization', 'ip', 'location'][Math.floor(Math.random() * 4)],
                confidence: parseFloat((Math.random()).toFixed(2)),
            }));
            const edges = nodes.map((node) => ({
                id: `${node.id}-edge`,
                source: nodeId,
                target: node.id,
                type: 'association',
                weight: parseFloat(Math.random().toFixed(2)),
            }));
            onNodesReceived(nodes, edges);
            processed += nodes.length;
            setStreamStats((prev) => ({
                nodesReceived: prev.nodesReceived + nodes.length,
                edgesReceived: prev.edgesReceived + edges.length,
                batchesProcessed: prev.batchesProcessed + 1,
            }));
            setProgress({
                processed,
                total: totalBatches,
                percentage: Math.min((processed / totalBatches) * 100, 100),
                eta: Math.max(totalBatches - processed, 0),
            });
            if (processed >= totalBatches) {
                clearInterval(interval);
                setIsStreaming(false);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [batchLimit, isStreaming, maxDepth, nodeId, onNodesReceived]);
    const startStreaming = (0, react_1.useCallback)(() => {
        setIsStreaming(true);
        setStreamStats({ nodesReceived: 0, edgesReceived: 0, batchesProcessed: 0 });
        setProgress(null);
    }, []);
    const stopStreaming = (0, react_1.useCallback)(() => {
        setIsStreaming(false);
        setProgress(null);
    }, []);
    return (<material_1.Paper elevation={1} sx={{ p: 2 }}>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <icons_material_1.NetworkCheck color="primary"/>
        <material_1.Typography variant="subtitle2">Neighborhood Streaming</material_1.Typography>

        <material_1.Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <material_1.Chip size="small" label={`Depth ${maxDepth}`} variant="outlined"/>

          {!isStreaming ? (<material_1.Button size="small" startIcon={<icons_material_1.PlayArrow />} onClick={startStreaming} variant="outlined">
              Stream
            </material_1.Button>) : (<material_1.Button size="small" startIcon={<icons_material_1.Stop />} onClick={stopStreaming} color="secondary" variant="outlined">
              Stop
            </material_1.Button>)}

          <material_1.IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
        }}>
            <icons_material_1.ExpandMore />
          </material_1.IconButton>
        </material_1.Box>
      </material_1.Box>

      {isStreaming && progress && (<material_1.Box sx={{ mb: 2 }}>
          <material_1.LinearProgress variant="determinate" value={progress.percentage} sx={{ mb: 1 }}/>
          <material_1.Typography variant="caption" color="text.secondary">
            {progress.processed} / {progress.total} processed (
            {progress.percentage.toFixed(1)}%)
            {progress.eta !== undefined &&
                ` • Remaining batches: ${progress.eta}`}
          </material_1.Typography>
        </material_1.Box>)}

      <material_1.Collapse in={expanded}>
        <material_1.Box sx={{ mt: 2 }}>
          {isStreaming && !progress && (<material_1.Alert severity="info" sx={{ mb: 2 }}>
              Initializing neighborhood stream...
            </material_1.Alert>)}

          <material_1.Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <material_1.Chip size="small" label={`${streamStats.nodesReceived} nodes`} color="primary"/>
            <material_1.Chip size="small" label={`${streamStats.edgesReceived} edges`} color="secondary"/>
            <material_1.Chip size="small" label={`${streamStats.batchesProcessed} batches`} variant="outlined"/>
          </material_1.Box>

          <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Streaming neighbors in batches of {batchLimit} to maintain UI
            responsiveness
          </material_1.Typography>
        </material_1.Box>
      </material_1.Collapse>
    </material_1.Paper>);
}
