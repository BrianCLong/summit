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
exports.KShortestPathsPanel = KShortestPathsPanel;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const graphql_1 = require("../../generated/graphql");
const MAX_K = 5;
const MAX_DEPTH = 6;
const createMockPaths = (nodes = [], sourceId, targetId, kValue, maxDepthValue, pathType) => {
    const availableNodes = nodes.length > 0
        ? nodes
        : Array.from({ length: 10 }, (_, idx) => ({
            id: `node-${idx}`,
            label: `Node ${idx}`,
        }));
    const generatePath = (index) => {
        const hopCount = Math.min(maxDepthValue, Math.max(2, Math.floor(Math.random() * maxDepthValue) + 2));
        const intermediates = [];
        for (let i = 0; i < hopCount - 2; i++) {
            const randomNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
            intermediates.push({ id: randomNode.id, label: randomNode.label });
        }
        const pathNodes = [
            { id: sourceId, label: sourceId },
            ...intermediates,
            { id: targetId, label: targetId },
        ];
        return {
            id: `mock-path-${Date.now()}-${index}`,
            nodes: pathNodes,
            length: pathNodes.length - 1,
            score: Math.random() * 10,
            significance: pathType !== 'all' ? Math.random() > 0.5 : undefined,
        };
    };
    return Array.from({ length: Math.min(kValue, MAX_K) }, (_, idx) => generatePath(idx));
};
function KShortestPathsPanel({ selectedNodes, onPathSelect, onPathHighlight, }) {
    const [sourceId, setSourceId] = (0, react_1.useState)('');
    const [targetId, setTargetId] = (0, react_1.useState)('');
    const [k, setK] = (0, react_1.useState)(3);
    const [maxDepth, setMaxDepth] = (0, react_1.useState)(4);
    const [pathType, setPathType] = (0, react_1.useState)('all');
    const [operationId, setOperationId] = (0, react_1.useState)(null);
    const [paths, setPaths] = (0, react_1.useState)([]);
    const [metadata, setMetadata] = (0, react_1.useState)(null);
    const [localError, setLocalError] = (0, react_1.useState)(null);
    const [findPaths, { loading, error }] = (0, graphql_1.useMockKShortestPathsLazyQuery)();
    const canSearch = sourceId && targetId && sourceId !== targetId;
    const handleSearch = (0, react_1.useCallback)(() => {
        if (!canSearch)
            return;
        const newOperationId = `path-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setOperationId(newOperationId);
        setLocalError(null);
        setPaths([]);
        setMetadata(null);
        findPaths({
            variables: {
                sourceId,
                targetId,
            },
        })
            .then((result) => {
            const graphData = result.data?.graphData;
            const generatedPaths = createMockPaths(graphData?.nodes ?? [], sourceId, targetId, k, maxDepth, pathType);
            setPaths(generatedPaths);
            setMetadata({
                pathsFound: generatedPaths.length,
                searchTime: Math.floor(Math.random() * 200) + 50,
                nodesExplored: Math.min(graphData?.nodes.length ?? generatedPaths.length * 2, maxDepth * generatedPaths.length),
                maxDepthReached: Math.min(maxDepth, generatedPaths.reduce((max, path) => Math.max(max, path.nodes.length - 1), 0)),
            });
        })
            .catch((err) => {
            setLocalError(err instanceof Error ? err.message : 'Failed to compute paths.');
        });
    }, [canSearch, findPaths, maxDepth, pathType, sourceId, targetId, k]);
    const handleCancel = (0, react_1.useCallback)(() => {
        setOperationId(null);
    }, []);
    // Auto-fill from selected nodes
    const handleSelectFromGraph = (0, react_1.useCallback)(() => {
        if (selectedNodes.length >= 2) {
            setSourceId(selectedNodes[0]);
            setTargetId(selectedNodes[1]);
        }
    }, [selectedNodes]);
    return (<material_1.Paper elevation={1} sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <icons_material_1.Timeline color="primary"/>
        <material_1.Typography variant="h6">Path Finding</material_1.Typography>

        {selectedNodes.length >= 2 && (<material_1.Tooltip title="Use selected nodes">
            <material_1.Button size="small" onClick={handleSelectFromGraph} startIcon={<icons_material_1.FilterList />}>
              From Selection
            </material_1.Button>
          </material_1.Tooltip>)}
      </material_1.Box>

      {/* Search Form */}
      <material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <material_1.Box sx={{ display: 'flex', gap: 2 }}>
          <material_1.TextField label="Source Node ID" value={sourceId} onChange={(e) => setSourceId(e.target.value)} size="small" fullWidth placeholder="node-123"/>
          <material_1.TextField label="Target Node ID" value={targetId} onChange={(e) => setTargetId(e.target.value)} size="small" fullWidth placeholder="node-456"/>
        </material_1.Box>

        <material_1.Box sx={{ display: 'flex', gap: 2 }}>
          <material_1.TextField label="Max Paths (k)" type="number" value={k} onChange={(e) => setK(Math.min(MAX_K, Math.max(1, parseInt(e.target.value) || 1)))} size="small" inputProps={{ min: 1, max: MAX_K }}/>

          <material_1.TextField label="Max Depth" type="number" value={maxDepth} onChange={(e) => setMaxDepth(Math.min(MAX_DEPTH, Math.max(1, parseInt(e.target.value) || 1)))} size="small" inputProps={{ min: 1, max: MAX_DEPTH }}/>

          <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
            <material_1.InputLabel>Path Type</material_1.InputLabel>
            <material_1.Select value={pathType} onChange={(e) => setPathType(e.target.value)} label="Path Type">
              <material_1.MenuItem value="all">All Types</material_1.MenuItem>
              <material_1.MenuItem value="shortest">Shortest</material_1.MenuItem>
              <material_1.MenuItem value="strongest">Strongest</material_1.MenuItem>
              <material_1.MenuItem value="diverse">Diverse</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>
        </material_1.Box>

        <material_1.Box sx={{ display: 'flex', gap: 1 }}>
          {!loading ? (<material_1.Button variant="contained" startIcon={<icons_material_1.PlayArrow />} onClick={handleSearch} disabled={!canSearch}>
              Find Paths
            </material_1.Button>) : (<material_1.Button variant="outlined" color="secondary" startIcon={<icons_material_1.Cancel />} onClick={handleCancel}>
                Cancel Search
              </material_1.Button>)}

          <material_1.Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <material_1.Chip size="small" label={`k≤${k}`} variant="outlined"/>
            <material_1.Chip size="small" label={`depth≤${maxDepth}`} variant="outlined"/>
          </material_1.Box>
        </material_1.Box>
      </material_1.Box>

      {/* Loading State */}
      {loading && (<material_1.Box sx={{ mb: 2 }}>
          <material_1.LinearProgress />
          <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Exploring graph paths... This may take a few seconds.
          </material_1.Typography>
        </material_1.Box>)}

      {/* Error State */}
      {(error || localError) && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          Path finding failed: {error?.message ?? localError}
        </material_1.Alert>)}

      {/* Results Metadata */}
      {metadata && (<material_1.Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <material_1.Typography variant="caption" color="text.secondary">
            Found {metadata.pathsFound} path
            {metadata.pathsFound !== 1 ? 's' : ''} in {metadata.searchTime}ms •
            Explored {metadata.nodesExplored} nodes • Max depth reached:{' '}
            {metadata.maxDepthReached}
          </material_1.Typography>
        </material_1.Box>)}

      {/* Path Results */}
      {paths.length > 0 && (<material_1.Box>
          <material_1.Typography variant="subtitle2" sx={{ mb: 1 }}>
            Paths Found ({paths.length})
          </material_1.Typography>

          <material_1.List dense>
            {paths.map((path, index) => (<react_1.default.Fragment key={path.id}>
                <material_1.ListItemButton component="li" onClick={() => onPathSelect(path)} onMouseEnter={() => onPathHighlight(path)} sx={{ borderRadius: 1, mb: 0.5 }}>
                  <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <material_1.Typography variant="subtitle2">
                          Path {index + 1}
                        </material_1.Typography>
                        <material_1.Chip size="small" label={`${path.length} hops`} color="primary" variant="outlined"/>
                        <material_1.Chip size="small" label={`Score: ${path.score?.toFixed(2) || 'N/A'}`} color="secondary" variant="outlined"/>
                        {path.significance && (<material_1.Chip size="small" label="Significant" color="warning"/>)}
                      </material_1.Box>} secondary={<material_1.Typography variant="caption" color="text.secondary">
                        {path.nodes.map((node) => node.label).join(' → ')}
                      </material_1.Typography>}/>

                  <material_1.IconButton size="small" onClick={() => onPathSelect(path)}>
                    <icons_material_1.Visibility fontSize="small"/>
                  </material_1.IconButton>
                </material_1.ListItemButton>

                {index < paths.length - 1 && <material_1.Divider />}
              </react_1.default.Fragment>))}
          </material_1.List>
        </material_1.Box>)}

      {paths.length === 0 &&
            !loading &&
            !error &&
            !localError &&
            sourceId &&
            targetId && (<material_1.Alert severity="info">
          No paths found between the selected nodes within the specified
          constraints. Try increasing the maximum depth or adjusting the path
          type filter.
        </material_1.Alert>)}
    </material_1.Paper>);
}
