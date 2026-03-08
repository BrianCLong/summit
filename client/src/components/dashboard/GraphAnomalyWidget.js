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
exports.GraphAnomalyWidget = void 0;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const WarningAmber_1 = __importDefault(require("@mui/icons-material/WarningAmber"));
const CheckCircle_1 = __importDefault(require("@mui/icons-material/CheckCircle"));
const Refresh_1 = __importDefault(require("@mui/icons-material/Refresh"));
const GRAPH_TRAVERSAL_ANOMALIES = (0, client_1.gql) `
  query GraphTraversalAnomalies(
    $entityId: ID!
    $investigationId: ID!
    $radius: Int
    $threshold: Float
    $contamination: Float
  ) {
    graphTraversalAnomalies(
      entityId: $entityId
      investigationId: $investigationId
      radius: $radius
      threshold: $threshold
      contamination: $contamination
    ) {
      summary {
        totalNodes
        totalEdges
        anomalyCount
        modelVersion
        threshold
        contamination
      }
      nodes {
        id
        score
        isAnomaly
        reason
        label
        type
        metrics
      }
      metadata
    }
  }
`;
const GraphAnomalyWidget = ({ investigationId, defaultEntityId = '', radius = 1, threshold = 0.6, contamination = 0.15, }) => {
    const [entityInput, setEntityInput] = (0, react_1.useState)(defaultEntityId);
    const [activeEntityId, setActiveEntityId] = (0, react_1.useState)(defaultEntityId);
    (0, react_1.useEffect)(() => {
        setEntityInput(defaultEntityId || '');
        setActiveEntityId(defaultEntityId || '');
    }, [defaultEntityId]);
    const shouldSkip = !investigationId || !activeEntityId;
    const { data, loading, error, refetch } = (0, client_1.useQuery)(GRAPH_TRAVERSAL_ANOMALIES, {
        variables: {
            entityId: activeEntityId,
            investigationId,
            radius,
            threshold,
            contamination,
        },
        skip: shouldSkip,
        fetchPolicy: 'network-only',
    });
    const summary = data?.graphTraversalAnomalies?.summary;
    const anomalies = (0, react_1.useMemo)(() => data?.graphTraversalAnomalies?.nodes ?? [], [data]);
    const handleAnalyze = () => {
        if (!entityInput.trim() || !investigationId) {
            return;
        }
        setActiveEntityId(entityInput.trim());
        if (!shouldSkip) {
            refetch({
                entityId: entityInput.trim(),
                investigationId,
                radius,
                threshold,
                contamination,
            });
        }
    };
    return (<material_1.Card elevation={2} sx={{ borderRadius: 2 }}>
      <material_1.CardContent>
        <material_1.Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={2}>
          <material_1.Box>
            <material_1.Typography variant="h6" component="h3">
              Graph Traversal Anomalies
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Isolation Forest scoring on Neo4j traversal neighborhoods
            </material_1.Typography>
          </material_1.Box>
          <material_1.Stack direction="row" spacing={1} alignItems="center">
            <material_1.TextField label="Root Entity ID" size="small" value={entityInput} onChange={(event) => setEntityInput(event.target.value)} placeholder="entity-123"/>
            <material_1.Button variant="contained" onClick={handleAnalyze} startIcon={<Refresh_1.default />} disabled={!investigationId}>
              Analyze
            </material_1.Button>
          </material_1.Stack>
        </material_1.Stack>

        {!investigationId && (<material_1.Alert severity="info" sx={{ mb: 2 }}>
            Select an investigation to run anomaly detection.
          </material_1.Alert>)}

        {loading && (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <material_1.LinearProgress sx={{ flex: 1 }}/>
            <material_1.Typography variant="body2" color="text.secondary">
              Scoring traversal...
            </material_1.Typography>
          </material_1.Box>)}

        {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
            Failed to load anomaly scores: {error.message}
          </material_1.Alert>)}

        {summary && (<material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
            <material_1.Chip label={`Nodes: ${summary.totalNodes}`} color="primary" variant="outlined"/>
            <material_1.Chip label={`Edges: ${summary.totalEdges}`} color="primary" variant="outlined"/>
            <material_1.Chip label={`Anomalies: ${summary.anomalyCount}`} color={summary.anomalyCount ? 'error' : 'success'} variant="filled"/>
            <material_1.Tooltip title={`Isolation Forest (${summary.modelVersion})`}>
              <material_1.Chip label={`Threshold: ${summary.threshold.toFixed(2)}`} variant="outlined"/>
            </material_1.Tooltip>
            <material_1.Chip label={`Contamination: ${(summary.contamination * 100).toFixed(1)}%`} variant="outlined"/>
          </material_1.Stack>)}

        {anomalies.length > 0 ? (<material_1.Stack spacing={1.5}>
            {anomalies.map((node) => (<material_1.Box key={node.id} sx={{
                    border: '1px solid',
                    borderColor: node.isAnomaly ? 'error.light' : 'grey.200',
                    borderRadius: 1.5,
                    p: 1.5,
                    backgroundColor: node.isAnomaly ? 'error.50' : 'background.paper',
                }}>
                <material_1.Stack direction="row" justifyContent="space-between" alignItems="center">
                  <material_1.Box>
                    <material_1.Stack direction="row" spacing={1} alignItems="center">
                      {node.isAnomaly ? (<WarningAmber_1.default color="error" fontSize="small"/>) : (<CheckCircle_1.default color="success" fontSize="small"/>)}
                      <material_1.Typography variant="subtitle1" fontWeight={600}>
                        {node.label || node.id}
                      </material_1.Typography>
                    </material_1.Stack>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {node.type || 'Entity'} · Score {node.score.toFixed(3)}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Chip label={node.isAnomaly ? 'Anomalous' : 'Baseline'} color={node.isAnomaly ? 'error' : 'default'} size="small"/>
                </material_1.Stack>
                <material_1.Divider sx={{ my: 1 }}/>
                <material_1.Typography variant="body2" color="text.primary">
                  {node.reason}
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  {Object.entries(node.metrics).map(([metric, value]) => (<material_1.Chip key={metric} label={`${metric}: ${value}`} size="small"/>))}
                </material_1.Stack>
              </material_1.Box>))}
          </material_1.Stack>) : (!loading && (<material_1.Typography variant="body2" color="text.secondary">
              {shouldSkip
                ? 'Provide an entity ID to run anomaly detection.'
                : 'No anomalies detected for this traversal.'}
            </material_1.Typography>))}
      </material_1.CardContent>
    </material_1.Card>);
};
exports.GraphAnomalyWidget = GraphAnomalyWidget;
exports.default = exports.GraphAnomalyWidget;
