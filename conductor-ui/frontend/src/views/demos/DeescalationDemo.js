"use strict";
/**
 * De-escalation Coaching Demo View
 *
 * Displays conversation analysis with coaching guidance for customer service scenarios.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeescalationDemo = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const DeescalationDemo = () => {
    const [results, setResults] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [selectedConv, setSelectedConv] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadDemoResults();
    }, []);
    const loadDemoResults = async () => {
        try {
            // In production, this would fetch from API
            const response = await fetch('/demos/deescalation/output/analysis_results.json');
            const data = await response.json();
            setResults(data);
            if (data.results.length > 0) {
                setSelectedConv(data.results[0]);
            }
            setLoading(false);
        }
        catch (err) {
            setError('Failed to load demo results. Run: npm run demo:deescalation');
            setLoading(false);
        }
    };
    const getRiskColor = (risk) => {
        switch (risk) {
            case 'critical':
                return 'error';
            case 'high':
                return 'warning';
            case 'medium':
                return 'info';
            case 'low':
                return 'success';
            default:
                return 'default';
        }
    };
    const getToxicityColor = (toxicity) => {
        if (toxicity >= 0.7)
            return 'error';
        if (toxicity >= 0.4)
            return 'warning';
        return 'success';
    };
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error || !results) {
        return <material_1.Alert severity="error">{error || 'No results available'}</material_1.Alert>;
    }
    return (<material_1.Box p={3}>
      {/* Header */}
      <material_1.Box mb={3}>
        <material_1.Typography variant="h4" gutterBottom>
          De-escalation Coaching Demo
        </material_1.Typography>
        <material_1.Typography variant="body2" color="textSecondary">
          AI-powered communication coaching for customer service excellence
        </material_1.Typography>
      </material_1.Box>

      {/* Summary Stats */}
      <material_1.Grid container spacing={2} mb={3}>
        <material_1.Grid item xs={12} md={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">{results.total_conversations}</material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Conversations Analyzed
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
        <material_1.Grid item xs={12} md={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">{results.avg_toxicity.toFixed(2)}</material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Average Toxicity
              </material_1.Typography>
              <material_1.LinearProgress variant="determinate" value={results.avg_toxicity * 100} color={getToxicityColor(results.avg_toxicity)} sx={{ mt: 1 }}/>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
        <material_1.Grid item xs={12} md={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Risk Distribution
              </material_1.Typography>
              <material_1.Stack spacing={1}>
                {Object.entries(results.risk_distribution).map(([risk, count]) => (<material_1.Box key={risk} display="flex" justifyContent="space-between">
                    <material_1.Chip label={risk} size="small" color={getRiskColor(risk)}/>
                    <material_1.Typography variant="body2">{count}</material_1.Typography>
                  </material_1.Box>))}
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
      </material_1.Grid>

      {/* Tabs */}
      <material_1.Card>
        <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <material_1.Tab label="Conversation Analysis"/>
          <material_1.Tab label="Coaching Guidance"/>
          <material_1.Tab label="Safety & Privacy"/>
        </material_1.Tabs>

        {/* Conversation Analysis Tab */}
        {selectedTab === 0 && (<material_1.CardContent>
            <material_1.Grid container spacing={2}>
              {/* Conversation List */}
              <material_1.Grid item xs={12} md={4}>
                <material_1.Typography variant="h6" gutterBottom>
                  Conversations
                </material_1.Typography>
                <material_1.Stack spacing={1}>
                  {results.results.map((result) => (<material_1.Card key={result.conversation.id} variant="outlined" sx={{
                    cursor: 'pointer',
                    bgcolor: selectedConv?.conversation.id === result.conversation.id
                        ? 'action.selected'
                        : 'background.paper',
                }} onClick={() => setSelectedConv(result)}>
                      <material_1.CardContent>
                        <material_1.Box display="flex" justifyContent="space-between" alignItems="center">
                          <material_1.Typography variant="body2" fontWeight="bold">
                            {result.conversation.id}
                          </material_1.Typography>
                          <material_1.Chip label={result.analysis.escalation_risk} size="small" color={getRiskColor(result.analysis.escalation_risk)}/>
                        </material_1.Box>
                        <material_1.Typography variant="caption" color="textSecondary">
                          {result.conversation.scenario}
                        </material_1.Typography>
                        <material_1.Box mt={1}>
                          <material_1.LinearProgress variant="determinate" value={result.analysis.diagnostic.toxicity * 100} color={getToxicityColor(result.analysis.diagnostic.toxicity)} sx={{ height: 4, borderRadius: 2 }}/>
                          <material_1.Typography variant="caption">
                            Toxicity: {result.analysis.diagnostic.toxicity.toFixed(2)}
                          </material_1.Typography>
                        </material_1.Box>
                      </material_1.CardContent>
                    </material_1.Card>))}
                </material_1.Stack>
              </material_1.Grid>

              {/* Selected Conversation Details */}
              <material_1.Grid item xs={12} md={8}>
                {selectedConv && (<material_1.Box>
                    <material_1.Typography variant="h6" gutterBottom>
                      {selectedConv.conversation.id}
                    </material_1.Typography>

                    {/* Original Message */}
                    <material_1.Accordion defaultExpanded>
                      <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                        <material_1.Typography variant="subtitle1">Customer Message</material_1.Typography>
                      </material_1.AccordionSummary>
                      <material_1.AccordionDetails>
                        <material_1.Alert severity="warning" sx={{ mb: 2 }}>
                          {selectedConv.conversation.customer_message}
                        </material_1.Alert>

                        <material_1.Grid container spacing={2}>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption" color="textSecondary">
                              Scenario
                            </material_1.Typography>
                            <material_1.Typography variant="body2">
                              {selectedConv.conversation.scenario}
                            </material_1.Typography>
                          </material_1.Grid>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption" color="textSecondary">
                              Escalation Risk
                            </material_1.Typography>
                            <material_1.Chip label={selectedConv.analysis.escalation_risk} color={getRiskColor(selectedConv.analysis.escalation_risk)} size="small"/>
                          </material_1.Grid>
                        </material_1.Grid>
                      </material_1.AccordionDetails>
                    </material_1.Accordion>

                    {/* Diagnostics */}
                    <material_1.Accordion>
                      <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                        <material_1.Typography variant="subtitle1">Tone Diagnostics</material_1.Typography>
                      </material_1.AccordionSummary>
                      <material_1.AccordionDetails>
                        <material_1.Grid container spacing={2}>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption">Toxicity</material_1.Typography>
                            <material_1.LinearProgress variant="determinate" value={selectedConv.analysis.diagnostic.toxicity * 100} color={getToxicityColor(selectedConv.analysis.diagnostic.toxicity)}/>
                            <material_1.Typography variant="body2">
                              {selectedConv.analysis.diagnostic.toxicity.toFixed(2)}
                            </material_1.Typography>
                          </material_1.Grid>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption">Absolutist Score</material_1.Typography>
                            <material_1.LinearProgress variant="determinate" value={selectedConv.analysis.diagnostic.absolutist_score * 100} color="warning"/>
                            <material_1.Typography variant="body2">
                              {selectedConv.analysis.diagnostic.absolutist_score.toFixed(2)}
                            </material_1.Typography>
                          </material_1.Grid>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption">Sentiment</material_1.Typography>
                            <material_1.Typography variant="body2">
                              {selectedConv.analysis.diagnostic.sentiment}
                            </material_1.Typography>
                          </material_1.Grid>
                          <material_1.Grid item xs={6}>
                            <material_1.Typography variant="caption">Emotion</material_1.Typography>
                            <material_1.Typography variant="body2">
                              {selectedConv.analysis.diagnostic.emotion}
                            </material_1.Typography>
                          </material_1.Grid>
                        </material_1.Grid>
                      </material_1.AccordionDetails>
                    </material_1.Accordion>

                    {/* Rewrite */}
                    <material_1.Accordion>
                      <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                        <material_1.Typography variant="subtitle1">De-escalated Version</material_1.Typography>
                      </material_1.AccordionSummary>
                      <material_1.AccordionDetails>
                        <material_1.Alert severity="success">
                          {selectedConv.analysis.rewrite.text}
                        </material_1.Alert>
                        <material_1.Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                          This version preserves the core message while reducing emotional charge.
                        </material_1.Typography>
                      </material_1.AccordionDetails>
                    </material_1.Accordion>
                  </material_1.Box>)}
              </material_1.Grid>
            </material_1.Grid>
          </material_1.CardContent>)}

        {/* Coaching Guidance Tab */}
        {selectedTab === 1 && (<material_1.CardContent>
            {selectedConv && (<material_1.Box>
                <material_1.Alert severity="info" icon={<icons_material_1.Psychology />} sx={{ mb: 2 }}>
                  AI Copilot coaching for this scenario
                </material_1.Alert>

                <material_1.Typography variant="h6" gutterBottom>
                  Recommended Approach
                </material_1.Typography>
                <material_1.List>
                  {selectedConv.analysis.guidance.map((item, idx) => (<material_1.ListItem key={idx}>
                      <material_1.ListItemText primary={item}/>
                    </material_1.ListItem>))}
                </material_1.List>

                <material_1.Box mt={3}>
                  <material_1.Typography variant="h6" gutterBottom>
                    Available Copilot Prompts
                  </material_1.Typography>
                  <material_1.Stack spacing={2}>
                    <material_1.Card variant="outlined">
                      <material_1.CardContent>
                        <material_1.Typography variant="subtitle2">Explain Analysis</material_1.Typography>
                        <material_1.Typography variant="body2" color="textSecondary">
                          Get detailed explanation of emotional dynamics and tone metrics
                        </material_1.Typography>
                      </material_1.CardContent>
                    </material_1.Card>
                    <material_1.Card variant="outlined">
                      <material_1.CardContent>
                        <material_1.Typography variant="subtitle2">Suggest Response</material_1.Typography>
                        <material_1.Typography variant="body2" color="textSecondary">
                          Get specific language coaching for de-escalation
                        </material_1.Typography>
                      </material_1.CardContent>
                    </material_1.Card>
                    <material_1.Card variant="outlined">
                      <material_1.CardContent>
                        <material_1.Typography variant="subtitle2">Scenario Guidance</material_1.Typography>
                        <material_1.Typography variant="body2" color="textSecondary">
                          Get best practices specific to this scenario type
                        </material_1.Typography>
                      </material_1.CardContent>
                    </material_1.Card>
                  </material_1.Stack>
                </material_1.Box>
              </material_1.Box>)}
          </material_1.CardContent>)}

        {/* Safety & Privacy Tab */}
        {selectedTab === 2 && (<material_1.CardContent>
            <material_1.Alert severity="success" icon={<icons_material_1.Security />} sx={{ mb: 3 }}>
              All customer data is PII-redacted before AI processing. Privacy is enforced at
              multiple layers.
            </material_1.Alert>

            <material_1.Typography variant="h6" gutterBottom>
              Safety Features
            </material_1.Typography>
            <material_1.List>
              <material_1.ListItem>
                <material_1.ListItemText primary="PII Redaction" secondary="Customer names, emails, phone numbers automatically redacted"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Escalation Triggers" secondary="Automatic flagging for legal threats, self-harm mentions, violence"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Audit Logging" secondary="All AI coaching interactions logged for quality review"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Evidence Grounding" secondary="All coaching advice grounded in linguistic evidence from the message"/>
              </material_1.ListItem>
            </material_1.List>

            <material_1.Box mt={3}>
              <material_1.Typography variant="body2" color="textSecondary">
                See full safety documentation: demos/copilot/SAFETY.md
              </material_1.Typography>
            </material_1.Box>
          </material_1.CardContent>)}
      </material_1.Card>
    </material_1.Box>);
};
exports.DeescalationDemo = DeescalationDemo;
exports.default = exports.DeescalationDemo;
