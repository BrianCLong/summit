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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilderPreview = QueryBuilderPreview;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const QueryChipBuilder_1 = require("./QueryChipBuilder");
const graphql_1 = require("./graphql");
const INITIAL_PREVIEW_STATE = {
    nodes: [],
    edges: [],
    progress: null,
    statistics: null,
    partial: null,
    lastEventId: null,
    errors: [],
};
function sanitizeIdentifier(value) {
    return value.replace(/[^a-zA-Z0-9_]/g, '_');
}
function formatCypherValue(rawValue) {
    const trimmed = rawValue.trim();
    if (/^(true|false)$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed !== '') {
        return numeric.toString();
    }
    const escaped = trimmed.replace(/'/g, "\\'");
    return `'${escaped}'`;
}
function buildCypherFromChips(chips, limit) {
    if (chips.length === 0) {
        return '';
    }
    const alias = 'n';
    const clauses = chips.map((chip) => {
        const field = `${alias}.${sanitizeIdentifier(chip.field)}`;
        const value = chip.value ?? '';
        const formatted = formatCypherValue(value);
        switch (chip.operator) {
            case 'contains':
                return `toLower(${field}) CONTAINS toLower(${formatted})`;
            case 'starts with':
                return `toLower(${field}) STARTS WITH toLower(${formatted})`;
            case 'ends with':
                return `toLower(${field}) ENDS WITH toLower(${formatted})`;
            case 'greater than':
                return `${field} > ${formatted}`;
            case 'less than':
                return `${field} < ${formatted}`;
            case 'between': {
                const parts = value
                    .split(/\s*(?:,|\.\.|-)\s*/)
                    .map((segment) => segment.trim())
                    .filter(Boolean);
                if (parts.length === 2) {
                    const [start, end] = parts.map(formatCypherValue);
                    return `${field} >= ${start} AND ${field} <= ${end}`;
                }
                return `${field} = ${formatted}`;
            }
            case 'exists':
                return `${field} IS NOT NULL`;
            case 'in':
                return `${field} IN [${value
                    .split(',')
                    .map((part) => formatCypherValue(part))
                    .join(', ')}]`;
            case 'not in':
                return `${field} NOT IN [${value
                    .split(',')
                    .map((part) => formatCypherValue(part))
                    .join(', ')}]`;
            case 'equals':
            default:
                return `${field} = ${formatted}`;
        }
    });
    const whereClause = clauses.join(' AND ');
    return `MATCH (${alias}) WHERE ${whereClause} RETURN ${alias} LIMIT ${Math.max(limit, 1)}`;
}
function useDebouncedValue(value, delayMs) {
    const [debounced, setDebounced] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const timer = window.setTimeout(() => {
            setDebounced(value);
        }, delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}
function QueryBuilderPreview({ initialChips = [], onPreviewUpdate, parameters = null, }) {
    const [chips, setChips] = (0, react_1.useState)(initialChips);
    const [limit, setLimit] = (0, react_1.useState)(25);
    const [previewState, setPreviewState] = (0, react_1.useState)(INITIAL_PREVIEW_STATE);
    const cypher = (0, react_1.useMemo)(() => buildCypherFromChips(chips, limit), [chips, limit]);
    const debouncedCypher = useDebouncedValue(cypher, 350);
    (0, react_1.useEffect)(() => {
        setPreviewState(INITIAL_PREVIEW_STATE);
    }, [debouncedCypher]);
    const handlePreviewUpdate = (0, react_1.useCallback)((event) => {
        if (!event)
            return;
        setPreviewState((prev) => {
            if (event.eventId && event.eventId === prev.lastEventId) {
                return prev;
            }
            const nodeMap = new Map();
            prev.nodes.forEach((node) => nodeMap.set(node.id, node));
            event.nodes?.forEach((node) => {
                if (!node?.id)
                    return;
                const existing = nodeMap.get(node.id);
                nodeMap.set(node.id, { ...existing, ...node });
            });
            const edgeMap = new Map();
            prev.edges.forEach((edge) => {
                const key = edge.id ?? `${edge.source}-${edge.target}`;
                edgeMap.set(key, edge);
            });
            event.edges?.forEach((edge) => {
                if (!edge?.source || !edge?.target)
                    return;
                const key = edge.id ?? `${edge.source}-${edge.target}`;
                const existing = edgeMap.get(key);
                edgeMap.set(key, { ...existing, ...edge });
            });
            const errors = event.errors?.map((err) => err?.message).filter(Boolean);
            return {
                nodes: Array.from(nodeMap.values()),
                edges: Array.from(edgeMap.values()),
                progress: event.progress ?? prev.progress,
                statistics: event.statistics ?? prev.statistics,
                partial: event.partial ?? prev.partial,
                lastEventId: event.eventId ?? prev.lastEventId,
                errors: errors ?? prev.errors,
            };
        });
    }, []);
    const { loading, error } = (0, client_1.useSubscription)(graphql_1.GRAPH_QUERY_PREVIEW_SUBSCRIPTION, {
        variables: {
            cypher: debouncedCypher,
            parameters,
            limit,
        },
        skip: !debouncedCypher,
        shouldResubscribe: true,
        onSubscriptionData: ({ subscriptionData }) => {
            handlePreviewUpdate(subscriptionData.data?.graphQueryPreview);
        },
        fetchPolicy: 'no-cache',
    });
    (0, react_1.useEffect)(() => {
        if (onPreviewUpdate) {
            onPreviewUpdate({ nodes: previewState.nodes, edges: previewState.edges });
        }
    }, [previewState.nodes, previewState.edges, onPreviewUpdate]);
    const statusMessage = (0, react_1.useMemo)(() => {
        if (!debouncedCypher) {
            return 'Add filters to generate a live preview.';
        }
        if (loading) {
            return 'Listening for preview updates…';
        }
        if (previewState.partial) {
            return 'Receiving partial graph results…';
        }
        if (previewState.nodes.length > 0 || previewState.edges.length > 0) {
            return 'Preview up to date.';
        }
        return 'No preview data received yet.';
    }, [debouncedCypher, loading, previewState.partial, previewState.nodes.length, previewState.edges.length]);
    const limitedNodes = (0, react_1.useMemo)(() => previewState.nodes.slice(0, 5), [previewState.nodes]);
    const limitedEdges = (0, react_1.useMemo)(() => previewState.edges.slice(0, 5), [previewState.edges]);
    return (<material_1.Paper elevation={2} sx={{ p: 2 }} data-testid="query-builder-preview">
      <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <icons_material_1.FilterList color="primary" aria-hidden/>
        <material_1.Typography variant="subtitle1" component="h2">
          Real-time Query Preview
        </material_1.Typography>
        {previewState.partial && (<material_1.Chip size="small" label="Streaming" color="primary" icon={<icons_material_1.PlayArrow fontSize="small"/>}/>)}
      </material_1.Stack>

      <material_1.Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Build your filters and watch partial graph results stream in from Neo4j.
      </material_1.Typography>

      <QueryChipBuilder_1.QueryChipBuilder chips={chips} onChipsChange={setChips}/>

      <Grid_1.default container spacing={1} sx={{ mt: 1 }} alignItems="center">
        <Grid_1.default item xs={12} sm={6} md={4}>
          <material_1.TextField label="Preview limit" type="number" size="small" value={limit} inputProps={{ min: 1, max: 500, 'aria-label': 'Preview limit' }} onChange={(event) => {
            const next = Number(event.target.value);
            setLimit(Number.isFinite(next) && next > 0 ? Math.min(next, 500) : 25);
        }}/>
        </Grid_1.default>
        {debouncedCypher && (<Grid_1.default item xs={12} sm={6} md={8}>
            <material_1.Tooltip title="Cypher query used for the preview">
              <material_1.Box sx={{
                bgcolor: 'grey.100',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 96,
                overflow: 'auto',
            }} aria-live="polite" role="note" data-testid="query-preview-query">
                {debouncedCypher}
              </material_1.Box>
            </material_1.Tooltip>
          </Grid_1.default>)}
      </Grid_1.default>

      <material_1.Box mt={2} role="status" aria-live="polite" data-testid="query-preview-status" sx={{ color: 'text.secondary', fontSize: 13 }}>
        {statusMessage}
      </material_1.Box>

      {loading && debouncedCypher && <material_1.LinearProgress sx={{ mt: 1 }} aria-hidden data-testid="query-preview-loading"/>}

      {error && (<material_1.Alert severity="error" sx={{ mt: 2 }} role="alert">
          Unable to stream preview data. {error.message}
        </material_1.Alert>)}

      {previewState.errors.length > 0 && (<material_1.Alert severity="warning" sx={{ mt: 2 }} role="alert">
          {previewState.errors.join(' ')}
        </material_1.Alert>)}

      {(limitedNodes.length > 0 || limitedEdges.length > 0) && (<material_1.Box sx={{ mt: 3 }}>
          <material_1.Typography variant="subtitle2" gutterBottom>
            Partial graph snapshot
          </material_1.Typography>
          <material_1.Divider sx={{ mb: 1 }}/>
          <Grid_1.default container spacing={2}>
            {limitedNodes.length > 0 && (<Grid_1.default item xs={12} md={6}>
                <material_1.Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Nodes
                </material_1.Typography>
                <material_1.List dense data-testid="query-preview-nodes">
                  {limitedNodes.map((node) => (<material_1.ListItem key={node.id} disableGutters>
                      <material_1.ListItemText primary={node.label ?? node.id} secondary={node.type ? `Type: ${node.type}` : undefined}/>
                    </material_1.ListItem>))}
                </material_1.List>
              </Grid_1.default>)}

            {limitedEdges.length > 0 && (<Grid_1.default item xs={12} md={6}>
                <material_1.Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Edges
                </material_1.Typography>
                <material_1.List dense data-testid="query-preview-edges">
                  {limitedEdges.map((edge) => (<material_1.ListItem key={edge.id ?? `${edge.source}-${edge.target}`} disableGutters>
                      <material_1.ListItemText primary={edge.type ?? 'relationship'} secondary={`${edge.source} → ${edge.target}`}/>
                    </material_1.ListItem>))}
                </material_1.List>
              </Grid_1.default>)}
          </Grid_1.default>
        </material_1.Box>)}
    </material_1.Paper>);
}
exports.default = QueryBuilderPreview;
