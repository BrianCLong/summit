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
const react_1 = __importStar(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const detector_1 = require("../../psyops-monitor/detector");
const EnhancedPsyOpsMonitor = () => {
    const [isMonitoring, setIsMonitoring] = (0, react_1.useState)(false);
    const [inputText, setInputText] = (0, react_1.useState)('');
    const [analysisResults, setAnalysisResults] = (0, react_1.useState)([]);
    const [metrics, setMetrics] = (0, react_1.useState)({
        totalAnalyzed: 0,
        threatsDetected: 0,
        averageScore: 0,
        lastUpdate: new Date(),
    });
    const [realTimeEnabled, setRealTimeEnabled] = (0, react_1.useState)(false);
    // Enhanced analysis function that integrates with backend capabilities
    const performAnalysis = (0, react_1.useCallback)(async (text, source = 'manual') => {
        if (!text.trim())
            return;
        // Use the existing client-side detector
        const basicAnalysis = (0, detector_1.analyzeText)(text);
        // Enhanced analysis with additional checks
        const enhancedScore = calculateEnhancedScore(text, basicAnalysis);
        const countermeasures = generateCountermeasures(basicAnalysis.tags, enhancedScore);
        const result = {
            id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            score: enhancedScore,
            tags: basicAnalysis.tags,
            timestamp: new Date(),
            source,
            countermeasures,
        };
        setAnalysisResults((prev) => [result, ...prev.slice(0, 49)]); // Keep last 50 results
        // Update metrics
        setMetrics((prev) => ({
            totalAnalyzed: prev.totalAnalyzed + 1,
            threatsDetected: prev.threatsDetected + (enhancedScore > 0.5 ? 1 : 0),
            averageScore: (prev.averageScore * prev.totalAnalyzed + enhancedScore) /
                (prev.totalAnalyzed + 1),
            lastUpdate: new Date(),
        }));
        // If this is a high-risk detection, could trigger backend notification
        if (enhancedScore > 0.7) {
            console.log('High-risk content detected:', {
                score: enhancedScore,
                tags: basicAnalysis.tags,
                text: text.substring(0, 100),
            });
        }
    }, []);
    // Enhanced scoring that considers additional factors
    const calculateEnhancedScore = (text, basicAnalysis) => {
        let score = basicAnalysis.score;
        // Additional scoring factors
        const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
        if (text.length > 0) {
            const upperCaseRatio = uppercaseCount / text.length;
            if (upperCaseRatio > 0.3)
                score += 0.1;
        }
        const exclamationCount = (text.match(/!/g) || []).length;
        if (exclamationCount > 2)
            score += 0.1; // Excessive exclamation
        const urgencyWords = [
            'urgent',
            'immediate',
            'now',
            'hurry',
            'crisis',
            'emergency',
        ];
        if (urgencyWords.some((word) => text.toLowerCase().includes(word))) {
            score += 0.15; // Urgency manipulation
        }
        const repetitionPattern = /(.{3,})\1{2,}/i;
        if (repetitionPattern.test(text))
            score += 0.1; // Repetitive content
        return Math.min(1, score);
    };
    // Generate defensive countermeasures based on detected patterns
    const generateCountermeasures = (tags, score) => {
        const countermeasures = [];
        if (tags.includes('bias')) {
            countermeasures.push('Source verification recommended');
            countermeasures.push('Cross-reference with factual sources');
        }
        if (tags.some((tag) => tag.startsWith('emotion:'))) {
            countermeasures.push('Emotional manipulation detected - apply critical thinking');
            countermeasures.push('Consider the emotional intent behind the message');
        }
        if (score > 0.7) {
            countermeasures.push('High-risk content - human review recommended');
            countermeasures.push('Consider content isolation or flagging');
        }
        if (score > 0.5) {
            countermeasures.push('Moderate risk - monitor for patterns');
        }
        return countermeasures;
    };
    // Simulate real-time monitoring
    (0, react_1.useEffect)(() => {
        let interval;
        if (realTimeEnabled && isMonitoring) {
            interval = setInterval(() => {
                // Simulate incoming content for monitoring
                const simulatedContent = [
                    'Breaking: Urgent action needed on this critical issue!',
                    'Everyone knows this is fake news and propaganda!',
                    "You should be furious about what they're hiding from you!",
                    'The truth is they never tell you the real story.',
                    'Normal news content with balanced reporting.',
                ];
                const randomContent = simulatedContent[Math.floor(Math.random() * simulatedContent.length)];
                performAnalysis(randomContent, 'real-time');
            }, 5000); // Analyze every 5 seconds
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [realTimeEnabled, isMonitoring, performAnalysis]);
    const handleManualAnalysis = () => {
        performAnalysis(inputText, 'manual');
        setInputText('');
    };
    const getScoreColor = (score) => {
        if (score >= 0.7)
            return 'error';
        if (score >= 0.4)
            return 'warning';
        return 'success';
    };
    const getScoreLabel = (score) => {
        if (score >= 0.7)
            return 'High Risk';
        if (score >= 0.4)
            return 'Medium Risk';
        return 'Low Risk';
    };
    return (<material_1.Box sx={{ p: 3 }}>
      <material_1.Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <icons_material_1.Psychology color="primary"/>
        Enhanced PsyOps Monitor
      </material_1.Typography>

      <material_1.Alert severity="info" sx={{ mb: 3 }}>
        <strong>Defensive Security Tool:</strong> This monitor analyzes content
        for psychological manipulation patterns and provides defensive
        countermeasures. All analysis is for protective purposes only.
      </material_1.Alert>

      {/* Control Panel */}
      <material_1.Card sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Monitor Controls
          </material_1.Typography>
          <Grid_1.default container spacing={2} alignItems="center">
            <Grid_1.default item>
              <material_1.FormControlLabel control={<material_1.Switch checked={isMonitoring} onChange={(e) => setIsMonitoring(e.target.checked)}/>} label="Active Monitoring"/>
            </Grid_1.default>
            <Grid_1.default item>
              <material_1.FormControlLabel control={<material_1.Switch checked={realTimeEnabled} onChange={(e) => setRealTimeEnabled(e.target.checked)}/>} label="Real-Time Simulation"/>
            </Grid_1.default>
            <Grid_1.default item>
              <material_1.Tooltip title="Refresh analysis results">
                <material_1.IconButton onClick={() => setAnalysisResults([])}>
                  <icons_material_1.Refresh />
                </material_1.IconButton>
              </material_1.Tooltip>
            </Grid_1.default>
          </Grid_1.default>
        </material_1.CardContent>
      </material_1.Card>

      {/* Metrics Dashboard */}
      <Grid_1.default container spacing={3} sx={{ mb: 3 }}>
        <Grid_1.default item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="primary">
                {metrics.totalAnalyzed}
              </material_1.Typography>
              <material_1.Typography variant="body2">Total Analyzed</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="error">
                {metrics.threatsDetected}
              </material_1.Typography>
              <material_1.Typography variant="body2">Threats Detected</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="warning.main">
                {(metrics.averageScore * 100).toFixed(1)}%
              </material_1.Typography>
              <material_1.Typography variant="body2">Avg Risk Score</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default item xs={12} md={3}>
          <material_1.Card>
            <material_1.CardContent sx={{ textAlign: 'center' }}>
              <material_1.Typography variant="h4" color="success.main">
                {isMonitoring ? 'Active' : 'Inactive'}
              </material_1.Typography>
              <material_1.Typography variant="body2">Monitor Status</material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      {/* Manual Analysis Input */}
      <material_1.Card sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Manual Content Analysis
          </material_1.Typography>
          <Grid_1.default container spacing={2}>
            <Grid_1.default item xs={12} md={9}>
              <material_1.TextField fullWidth multiline rows={3} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Enter content to analyze for psychological manipulation patterns..." variant="outlined"/>
            </Grid_1.default>
            <Grid_1.default item xs={12} md={3}>
              <material_1.Button fullWidth variant="contained" onClick={handleManualAnalysis} disabled={!inputText.trim()} sx={{ height: '100%' }} startIcon={<icons_material_1.Visibility />}>
                Analyze Content
              </material_1.Button>
            </Grid_1.default>
          </Grid_1.default>
        </material_1.CardContent>
      </material_1.Card>

      {/* Analysis Results */}
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <icons_material_1.Security />
            Analysis Results
            <material_1.Badge badgeContent={analysisResults.length} color="primary"/>
          </material_1.Typography>

          {analysisResults.length === 0 ? (<material_1.Alert severity="info">
              No analysis results yet. Enter content above or enable real-time
              monitoring to begin analysis.
            </material_1.Alert>) : (<material_1.List>
              {analysisResults.map((result, index) => (<material_1.Accordion key={result.id} defaultExpanded={index === 0}>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                    <material_1.Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                }}>
                      <material_1.Chip label={getScoreLabel(result.score)} color={getScoreColor(result.score)} size="small"/>
                      <material_1.Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {result.text}
                      </material_1.Typography>
                      <material_1.Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                      </material_1.Typography>
                    </material_1.Box>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <Grid_1.default container spacing={2}>
                      <Grid_1.default item xs={12} md={6}>
                        <material_1.Typography variant="subtitle2" gutterBottom>
                          Risk Assessment
                        </material_1.Typography>
                        <material_1.Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                }}>
                          <material_1.Typography variant="body2">Risk Score:</material_1.Typography>
                          <material_1.LinearProgress variant="determinate" value={result.score * 100} color={getScoreColor(result.score)} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}/>
                          <material_1.Typography variant="body2">
                            {(result.score * 100).toFixed(1)}%
                          </material_1.Typography>
                        </material_1.Box>
                        <material_1.Typography variant="subtitle2" gutterBottom>
                          Detected Patterns
                        </material_1.Typography>
                        <material_1.Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {result.tags.map((tag, i) => (<material_1.Chip key={i} label={tag} size="small" variant="outlined"/>))}
                          {result.tags.length === 0 && (<material_1.Typography variant="body2" color="text.secondary">
                              No specific patterns detected
                            </material_1.Typography>)}
                        </material_1.Box>
                      </Grid_1.default>
                      <Grid_1.default item xs={12} md={6}>
                        <material_1.Typography variant="subtitle2" gutterBottom>
                          Recommended Countermeasures
                        </material_1.Typography>
                        {result.countermeasures &&
                    result.countermeasures.length > 0 ? (<material_1.List dense>
                            {result.countermeasures.map((measure, i) => (<material_1.ListItem key={i} sx={{ pl: 0 }}>
                                <material_1.ListItemText primary={measure} primaryTypographyProps={{ variant: 'body2' }}/>
                              </material_1.ListItem>))}
                          </material_1.List>) : (<material_1.Typography variant="body2" color="text.secondary">
                            No specific countermeasures needed
                          </material_1.Typography>)}
                      </Grid_1.default>
                    </Grid_1.default>
                  </material_1.AccordionDetails>
                </material_1.Accordion>))}
            </material_1.List>)}
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
};
exports.default = EnhancedPsyOpsMonitor;
