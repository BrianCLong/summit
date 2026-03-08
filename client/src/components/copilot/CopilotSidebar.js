"use strict";
/**
 * AI Copilot Sidebar - Minimum Lovable Product
 *
 * Features:
 * - Natural language query input
 * - Generated Cypher preview with explanation
 * - Cost/complexity estimation
 * - Safety checks with policy explanations
 * - Results with citations and provenance
 * - Hypothesis generation
 * - Narrative building
 *
 * Implements "Auditable by Design" requirements from Wishbook
 */
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
exports.default = CopilotSidebar;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const react_syntax_highlighter_1 = __importDefault(require("react-syntax-highlighter"));
const hljs_1 = require("react-syntax-highlighter/dist/esm/styles/hljs");
// GraphQL Queries
const PREVIEW_NL_QUERY = (0, client_2.gql) `
  query PreviewNLQuery($input: NLQueryInput!) {
    previewNLQuery(input: $input) {
      cypher
      explanation
      estimatedRows
      estimatedCost
      complexity
      warnings
      allowed
      blockReason
      auditId
    }
  }
`;
const EXECUTE_NL_QUERY = (0, client_2.gql) `
  mutation ExecuteNLQuery($input: NLQueryInput!) {
    executeNLQuery(input: $input) {
      records
      summary {
        recordCount
        executionTime
      }
      citations
      auditId
    }
  }
`;
const GENERATE_HYPOTHESES = (0, client_2.gql) `
  query GenerateHypotheses($input: HypothesisInput!) {
    generateHypotheses(input: $input) {
      id
      statement
      confidence
      supportingEvidence {
        id
        type
        description
        strength
      }
      suggestedSteps
    }
  }
`;
const GENERATE_NARRATIVE = (0, client_2.gql) `
  query GenerateNarrative($input: NarrativeInput!) {
    generateNarrative(input: $input) {
      id
      title
      content
      keyFindings
      citations
      confidence
      auditId
    }
  }
`;
function CopilotSidebar({ investigationId, userId, onEntityClick, }) {
    const [query, setQuery] = (0, react_1.useState)('');
    const [preview, setPreview] = (0, react_1.useState)(null);
    const [results, setResults] = (0, react_1.useState)(null);
    const [showCypher, setShowCypher] = (0, react_1.useState)(false);
    const [activeTab, setActiveTab] = (0, react_1.useState)('query');
    const [previewQuery, { loading: previewing }] = (0, client_1.useLazyQuery)(PREVIEW_NL_QUERY, {
        onCompleted: (data) => {
            setPreview(data.previewNLQuery);
            setResults(null);
        },
        onError: (error) => {
            console.error('Preview failed:', error);
        },
    });
    const [executeQuery, { loading: executing }] = (0, client_1.useMutation)(EXECUTE_NL_QUERY, {
        onCompleted: (data) => {
            setResults(data.executeNLQuery);
        },
        onError: (error) => {
            console.error('Execution failed:', error);
        },
    });
    const [generateHypotheses, { data: hypothesesData, loading: generatingHypotheses }] = (0, client_1.useLazyQuery)(GENERATE_HYPOTHESES);
    const [generateNarrative, { data: narrativeData, loading: generatingNarrative }] = (0, client_1.useLazyQuery)(GENERATE_NARRATIVE);
    const handlePreview = () => {
        if (!query.trim())
            return;
        previewQuery({
            variables: {
                input: {
                    query: query.trim(),
                    investigationId,
                    userId,
                    dryRun: true,
                },
            },
        });
    };
    const handleExecute = () => {
        if (!preview || !preview.allowed)
            return;
        executeQuery({
            variables: {
                input: {
                    query: query.trim(),
                    investigationId,
                    userId,
                    dryRun: false,
                },
            },
        });
    };
    const handleGenerateHypotheses = () => {
        generateHypotheses({
            variables: {
                input: {
                    investigationId,
                    count: 3,
                },
            },
        });
    };
    const handleGenerateNarrative = () => {
        generateNarrative({
            variables: {
                input: {
                    investigationId,
                    style: 'ANALYTICAL',
                },
            },
        });
    };
    const getComplexityColor = (complexity) => {
        switch (complexity) {
            case 'low':
                return 'success';
            case 'medium':
                return 'warning';
            case 'high':
                return 'error';
            default:
                return 'default';
        }
    };
    return (<material_1.Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <material_1.CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        <material_1.Typography variant="h5" gutterBottom>
          🤖 AI Copilot
        </material_1.Typography>
        <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
          Ask questions in natural language. Preview and approve queries before execution.
        </material_1.Typography>

        <material_1.Divider sx={{ my: 2 }}/>

        {/* Tab Selection */}
        <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <material_1.Button size="small" variant={activeTab === 'query' ? 'contained' : 'outlined'} onClick={() => setActiveTab('query')} startIcon={<icons_material_1.Code />}>
            Query
          </material_1.Button>
          <material_1.Button size="small" variant={activeTab === 'hypotheses' ? 'contained' : 'outlined'} onClick={() => setActiveTab('hypotheses')} startIcon={<icons_material_1.Lightbulb />}>
            Hypotheses
          </material_1.Button>
          <material_1.Button size="small" variant={activeTab === 'narrative' ? 'contained' : 'outlined'} onClick={() => setActiveTab('narrative')} startIcon={<icons_material_1.Article />}>
            Narrative
          </material_1.Button>
        </material_1.Stack>

        {/* Query Tab */}
        {activeTab === 'query' && (<>
            {/* Query Input */}
            <material_1.TextField fullWidth multiline rows={3} placeholder="Ask me anything about this investigation...

Examples:
• Show me all persons connected to financial entities
• Find entities with more than 5 connections
• What are the most recent entities added?" value={query} onChange={(e) => setQuery(e.target.value)} disabled={previewing || executing} sx={{ mb: 2 }}/>

            <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <material_1.Button variant="outlined" startIcon={<icons_material_1.Visibility />} onClick={handlePreview} disabled={!query.trim() || previewing || executing} fullWidth>
                {previewing ? 'Generating...' : 'Preview Query'}
              </material_1.Button>
            </material_1.Stack>

            {/* Preview Section */}
            {preview && (<material_1.Box sx={{ mb: 2 }}>
                {/* Policy Block Message */}
                {!preview.allowed && (<material_1.Alert severity="error" icon={<icons_material_1.Block />} sx={{ mb: 2 }}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Query Blocked
                    </material_1.Typography>
                    <material_1.Typography variant="body2">{preview.blockReason}</material_1.Typography>
                    {preview.warnings && preview.warnings.length > 0 && (<material_1.Box sx={{ mt: 1 }}>
                        <material_1.Typography variant="caption" display="block" gutterBottom>
                          Reasons:
                        </material_1.Typography>
                        {preview.warnings.map((warning, idx) => (<material_1.Typography key={idx} variant="caption" display="block">
                            • {warning}
                          </material_1.Typography>))}
                      </material_1.Box>)}
                    <material_1.Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Audit ID: {preview.auditId}
                    </material_1.Typography>
                  </material_1.Alert>)}

                {/* Allowed Preview */}
                {preview.allowed && (<>
                    <material_1.Alert severity="success" icon={<icons_material_1.CheckCircle />} sx={{ mb: 2 }}>
                      <material_1.Typography variant="subtitle2">Query Ready for Execution</material_1.Typography>
                    </material_1.Alert>

                    {/* Explanation */}
                    <material_1.Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <material_1.Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <icons_material_1.Info color="primary" fontSize="small"/>
                        <material_1.Typography variant="subtitle2">What this query does:</material_1.Typography>
                      </material_1.Stack>
                      <material_1.Typography variant="body2">{preview.explanation}</material_1.Typography>
                    </material_1.Paper>

                    {/* Metrics */}
                    <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <material_1.Chip label={`~${preview.estimatedRows} rows`} size="small" icon={<icons_material_1.Info />}/>
                      <material_1.Chip label={`Cost: ${preview.estimatedCost} units`} size="small" color="primary"/>
                      <material_1.Chip label={`${preview.complexity} complexity`} size="small" color={getComplexityColor(preview.complexity)}/>
                    </material_1.Stack>

                    {/* Warnings */}
                    {preview.warnings && preview.warnings.length > 0 && (<material_1.Alert severity="warning" icon={<icons_material_1.Warning />} sx={{ mb: 2 }}>
                        <material_1.Typography variant="caption" display="block" gutterBottom>
                          Warnings:
                        </material_1.Typography>
                        {preview.warnings.map((warning, idx) => (<material_1.Typography key={idx} variant="caption" display="block">
                            • {warning}
                          </material_1.Typography>))}
                      </material_1.Alert>)}

                    {/* Cypher Code */}
                    <material_1.Box sx={{ mb: 2 }}>
                      <material_1.Button size="small" startIcon={showCypher ? <icons_material_1.ExpandLess /> : <icons_material_1.ExpandMore />} onClick={() => setShowCypher(!showCypher)}>
                        {showCypher ? 'Hide' : 'Show'} Generated Cypher
                      </material_1.Button>
                      <material_1.Collapse in={showCypher}>
                        <material_1.Paper variant="outlined" sx={{ mt: 1 }}>
                          <react_syntax_highlighter_1.default language="cypher" style={hljs_1.github}>
                            {preview.cypher}
                          </react_syntax_highlighter_1.default>
                        </material_1.Paper>
                      </material_1.Collapse>
                    </material_1.Box>

                    {/* Execute Button */}
                    <material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.PlayArrow />} onClick={handleExecute} disabled={executing} fullWidth>
                      {executing ? 'Executing...' : 'Execute Query'}
                    </material_1.Button>
                  </>)}
              </material_1.Box>)}

            {/* Results Section */}
            {results && (<material_1.Box>
                <material_1.Divider sx={{ my: 2 }}/>
                <material_1.Typography variant="h6" gutterBottom>
                  Results
                </material_1.Typography>

                <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <material_1.Chip label={`${results.summary.recordCount} records`} color="success" size="small"/>
                  <material_1.Chip label={`${results.summary.executionTime.toFixed(0)}ms`} size="small"/>
                  <material_1.Chip label={`${results.citations.length} entities`} color="primary" size="small"/>
                </material_1.Stack>

                {/* Citations */}
                {results.citations.length > 0 && (<material_1.Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Entity Citations:
                    </material_1.Typography>
                    <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {results.citations.map((entityId) => (<material_1.Chip key={entityId} label={entityId} size="small" onClick={() => onEntityClick?.(entityId)} clickable/>))}
                    </material_1.Stack>
                  </material_1.Paper>)}

                {/* Results Data */}
                <material_1.Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                  <material_1.List dense>
                    {results.records.map((record, idx) => (<material_1.ListItem key={idx}>
                        <material_1.ListItemText primary={`Record ${idx + 1}`} secondary={<material_1.Typography component="pre" variant="caption" sx={{ fontSize: '0.7rem' }}>
                              {JSON.stringify(record, null, 2)}
                            </material_1.Typography>}/>
                      </material_1.ListItem>))}
                  </material_1.List>
                </material_1.Paper>

                <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Audit ID: {results.auditId}
                </material_1.Typography>
              </material_1.Box>)}
          </>)}

        {/* Hypotheses Tab */}
        {activeTab === 'hypotheses' && (<>
            <material_1.Typography variant="body2" gutterBottom>
              Generate AI-powered hypotheses based on current investigation data.
            </material_1.Typography>

            <material_1.Button variant="contained" startIcon={<icons_material_1.Lightbulb />} onClick={handleGenerateHypotheses} disabled={generatingHypotheses} fullWidth sx={{ my: 2 }}>
              {generatingHypotheses ? 'Generating Hypotheses...' : 'Generate Hypotheses'}
            </material_1.Button>

            {generatingHypotheses && <material_1.LinearProgress sx={{ mb: 2 }}/>}

            {hypothesesData?.generateHypotheses && (<material_1.Stack spacing={2}>
                {hypothesesData.generateHypotheses.map((hypothesis) => (<material_1.Paper key={hypothesis.id} variant="outlined" sx={{ p: 2 }}>
                    <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <material_1.Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {hypothesis.statement}
                      </material_1.Typography>
                      <material_1.Chip label={`${(hypothesis.confidence * 100).toFixed(0)}%`} size="small" color={hypothesis.confidence > 0.7 ? 'success' : 'warning'}/>
                    </material_1.Stack>

                    {hypothesis.supportingEvidence.length > 0 && (<material_1.Box sx={{ ml: 2, mt: 1 }}>
                        <material_1.Typography variant="caption" display="block" gutterBottom>
                          Evidence:
                        </material_1.Typography>
                        {hypothesis.supportingEvidence.map((evidence) => (<material_1.Typography key={evidence.id} variant="caption" display="block">
                            • {evidence.description} ({evidence.type})
                          </material_1.Typography>))}
                      </material_1.Box>)}

                    {hypothesis.suggestedSteps.length > 0 && (<material_1.Box sx={{ ml: 2, mt: 1 }}>
                        <material_1.Typography variant="caption" display="block" gutterBottom>
                          Next Steps:
                        </material_1.Typography>
                        {hypothesis.suggestedSteps.map((step, idx) => (<material_1.Typography key={idx} variant="caption" display="block">
                            {idx + 1}. {step}
                          </material_1.Typography>))}
                      </material_1.Box>)}
                  </material_1.Paper>))}
              </material_1.Stack>)}
          </>)}

        {/* Narrative Tab */}
        {activeTab === 'narrative' && (<>
            <material_1.Typography variant="body2" gutterBottom>
              Generate a comprehensive narrative report of the investigation.
            </material_1.Typography>

            <material_1.Button variant="contained" startIcon={<icons_material_1.Article />} onClick={handleGenerateNarrative} disabled={generatingNarrative} fullWidth sx={{ my: 2 }}>
              {generatingNarrative ? 'Generating Narrative...' : 'Generate Narrative'}
            </material_1.Button>

            {generatingNarrative && <material_1.LinearProgress sx={{ mb: 2 }}/>}

            {narrativeData?.generateNarrative && (<material_1.Paper variant="outlined" sx={{ p: 2 }}>
                <material_1.Typography variant="h6" gutterBottom>
                  {narrativeData.generateNarrative.title}
                </material_1.Typography>

                <material_1.Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <material_1.Chip label={`${(narrativeData.generateNarrative.confidence * 100).toFixed(0)}% confidence`} size="small" color="primary"/>
                  <material_1.Chip label={`${narrativeData.generateNarrative.citations.length} entities`} size="small"/>
                </material_1.Stack>

                <material_1.Divider sx={{ my: 2 }}/>

                <material_1.Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                  {narrativeData.generateNarrative.content}
                </material_1.Typography>

                <material_1.Divider sx={{ my: 2 }}/>

                <material_1.Typography variant="subtitle2" gutterBottom>
                  Key Findings:
                </material_1.Typography>
                {narrativeData.generateNarrative.keyFindings.map((finding, idx) => (<material_1.Typography key={idx} variant="body2" sx={{ ml: 2 }}>
                      • {finding}
                    </material_1.Typography>))}

                <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                  Audit ID: {narrativeData.generateNarrative.auditId}
                </material_1.Typography>
              </material_1.Paper>)}
          </>)}
      </material_1.CardContent>
    </material_1.Card>);
}
