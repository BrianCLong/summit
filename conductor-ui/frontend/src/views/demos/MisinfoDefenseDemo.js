"use strict";
/**
 * Adversarial Misinformation Defense Demo View
 *
 * Displays demo results with interactive exploration of detection evidence.
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
exports.MisinfoDefenseDemo = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const MisinfoDefenseDemo = () => {
    const [results, setResults] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [selectedPost, setSelectedPost] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadDemoResults();
    }, []);
    const loadDemoResults = async () => {
        try {
            // In production, this would fetch from API
            // For demo, we'll simulate loading from the generated JSON
            const response = await fetch('/demos/misinfo-defense/output/analysis_results.json');
            const data = await response.json();
            setResults(data);
            setLoading(false);
        }
        catch (err) {
            setError('Failed to load demo results. Run: npm run demo:misinfo');
            setLoading(false);
        }
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'error';
            case 'high':
                return 'warning';
            case 'medium':
                return 'info';
            default:
                return 'default';
        }
    };
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error || !results) {
        return (<material_1.Alert severity="error">
        {error || 'No results available'}
      </material_1.Alert>);
    }
    return (<material_1.Box p={3}>
      {/* Header */}
      <material_1.Box mb={3}>
        <material_1.Typography variant="h4" gutterBottom>
          Adversarial Misinformation Defense Demo
        </material_1.Typography>
        <material_1.Typography variant="body2" color="textSecondary">
          Multi-modal detection across text, images, and video
        </material_1.Typography>
      </material_1.Box>

      {/* Summary Stats */}
      <material_1.Grid container spacing={2} mb={3}>
        <material_1.Grid item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">{results.total_posts}</material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Total Posts Analyzed
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
        <material_1.Grid item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" color="error">
                {results.misinfo_detected}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Misinfo Detected
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
        <material_1.Grid item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" color="success">
                {results.legitimate_content}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Legitimate Content
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
        <material_1.Grid item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">
                {(results.detection_rate * 100).toFixed(1)}%
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Detection Rate
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
      </material_1.Grid>

      {/* Tabs */}
      <material_1.Card>
        <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <material_1.Tab label="Detection Results"/>
          <material_1.Tab label="Evidence View"/>
          <material_1.Tab label="Copilot Examples"/>
        </material_1.Tabs>

        {/* Detection Results Tab */}
        {selectedTab === 0 && (<material_1.CardContent>
            <material_1.Table>
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Post ID</material_1.TableCell>
                  <material_1.TableCell>Platform</material_1.TableCell>
                  <material_1.TableCell>Content Preview</material_1.TableCell>
                  <material_1.TableCell>Status</material_1.TableCell>
                  <material_1.TableCell>Confidence</material_1.TableCell>
                  <material_1.TableCell>Evidence</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {results.results.map((result) => (<material_1.TableRow key={result.post.id} hover onClick={() => setSelectedPost(result)} style={{ cursor: 'pointer' }}>
                    <material_1.TableCell>{result.post.id}</material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={result.post.platform} size="small"/>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Typography variant="body2" noWrap style={{ maxWidth: 300 }}>
                        {result.post.text}
                      </material_1.Typography>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {result.analysis.is_misinfo ? (<material_1.Chip icon={<icons_material_1.Warning />} label="Misinfo" color="error" size="small"/>) : (<material_1.Chip icon={<icons_material_1.CheckCircle />} label="Legitimate" color="success" size="small"/>)}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Tooltip title={`${(result.analysis.confidence * 100).toFixed(1)}% confidence`}>
                        <material_1.Box display="flex" alignItems="center">
                          <material_1.CircularProgress variant="determinate" value={result.analysis.confidence * 100} size={24}/>
                          <material_1.Typography variant="caption" ml={1}>
                            {(result.analysis.confidence * 100).toFixed(0)}%
                          </material_1.Typography>
                        </material_1.Box>
                      </material_1.Tooltip>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Badge badgeContent={result.analysis.evidence.length} color="primary">
                        <icons_material_1.Info />
                      </material_1.Badge>
                    </material_1.TableCell>
                  </material_1.TableRow>))}
              </material_1.TableBody>
            </material_1.Table>

            {/* Selected Post Details */}
            {selectedPost && (<material_1.Box mt={3} p={2} bgcolor="background.default" borderRadius={1}>
                <material_1.Typography variant="h6" gutterBottom>
                  {selectedPost.post.id} - Details
                </material_1.Typography>
                <material_1.Typography variant="body1" gutterBottom>
                  {selectedPost.post.text}
                </material_1.Typography>

                <material_1.Box mt={2}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Evidence:
                  </material_1.Typography>
                  {selectedPost.analysis.evidence.map((ev, idx) => (<material_1.Alert key={idx} severity={getSeverityColor(ev.severity)} icon={<icons_material_1.Policy />} sx={{ mb: 1 }}>
                      <material_1.Typography variant="subtitle2">{ev.title}</material_1.Typography>
                      <material_1.Typography variant="body2">{ev.description}</material_1.Typography>
                      <material_1.Chip label={ev.type} size="small" sx={{ mt: 1 }}/>
                    </material_1.Alert>))}
                </material_1.Box>
              </material_1.Box>)}
          </material_1.CardContent>)}

        {/* Evidence View Tab */}
        {selectedTab === 1 && (<material_1.CardContent>
            <material_1.Alert severity="info" icon={<icons_material_1.Policy />} sx={{ mb: 2 }}>
              All detection decisions are backed by explicit evidence. Click any post to see details.
            </material_1.Alert>
            {/* Additional evidence visualizations could go here */}
            <material_1.Typography variant="body2" color="textSecondary">
              Evidence types: text_analysis, deepfake_detection, image_manipulation, narrative_context
            </material_1.Typography>
          </material_1.CardContent>)}

        {/* Copilot Tab */}
        {selectedTab === 2 && (<material_1.CardContent>
            <material_1.Alert severity="info" sx={{ mb: 2 }}>
              Copilot can explain detection reasoning. All responses are evidence-grounded and policy-safe.
            </material_1.Alert>
            <material_1.Typography variant="body1" gutterBottom>
              Available Copilot Prompts:
            </material_1.Typography>
            <material_1.Box component="ul">
              <li>
                <strong>Explain Detection:</strong> Why was this content flagged?
              </li>
              <li>
                <strong>Deepfake Analysis:</strong> Technical explanation of video forensics
              </li>
              <li>
                <strong>Fact-Checking Suggestions:</strong> How to verify this content
              </li>
              <li>
                <strong>Narrative Context:</strong> Understanding information spread patterns
              </li>
            </material_1.Box>
            <material_1.Typography variant="body2" color="textSecondary" mt={2}>
              See: demos/misinfo-defense/copilot/prompts.json
            </material_1.Typography>
          </material_1.CardContent>)}
      </material_1.Card>
    </material_1.Box>);
};
exports.MisinfoDefenseDemo = MisinfoDefenseDemo;
exports.default = exports.MisinfoDefenseDemo;
