"use strict";
/**
 * Run Comparison View Component
 *
 * Side-by-side comparison of two runs showing deltas in inputs, outputs, and confidence.
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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const RunComparisonView = ({ runIdA, runIdB }) => {
    const [comparison, setComparison] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [runA, setRunA] = (0, react_1.useState)(runIdA || '');
    const [runB, setRunB] = (0, react_1.useState)(runIdB || '');
    const handleCompare = (0, react_1.useCallback)(async (overrideA, overrideB) => {
        const compareA = overrideA ?? runA;
        const compareB = overrideB ?? runB;
        if (!compareA || !compareB) {
            setError('Please provide both run IDs');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/explainability/compare?run_a=${compareA}&run_b=${compareB}`);
            const result = await response.json();
            if (result.success) {
                setComparison(result.data);
            }
            else {
                setError(result.errors?.[0]?.message || 'Failed to compare runs');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    }, [runA, runB]);
    (0, react_1.useEffect)(() => {
        if (runIdA)
            setRunA(runIdA);
        if (runIdB)
            setRunB(runIdB);
    }, [runIdA, runIdB]);
    (0, react_1.useEffect)(() => {
        if (runIdA && runIdB) {
            void handleCompare(runIdA, runIdB);
        }
    }, [runIdA, runIdB, handleCompare]);
    const getConfidenceTrend = (delta) => {
        if (delta > 0.05)
            return <icons_material_1.TrendingUp color="success"/>;
        if (delta < -0.05)
            return <icons_material_1.TrendingDown color="error"/>;
        return <icons_material_1.TrendingFlat color="action"/>;
    };
    const getDurationTrend = (deltaMs) => {
        if (deltaMs === null)
            return null;
        if (deltaMs < -100)
            return <icons_material_1.TrendingUp color="success" titleAccess="Faster"/>;
        if (deltaMs > 100)
            return <icons_material_1.TrendingDown color="error" titleAccess="Slower"/>;
        return <icons_material_1.TrendingFlat color="action" titleAccess="Similar"/>;
    };
    const formatTimestamp = (iso) => {
        const date = new Date(iso);
        return date.toLocaleString();
    };
    return (<material_1.Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: 2 }}>
      <material_1.Typography variant="h4" gutterBottom>
        Run Comparison
      </material_1.Typography>

      {/* Input Section */}
      <material_1.Card sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" spacing={2} alignItems="center">
            <material_1.TextField label="Run A ID" value={runA} onChange={(e) => setRunA(e.target.value)} placeholder="Enter first run ID" sx={{ flexGrow: 1 }}/>
            <icons_material_1.CompareArrows />
            <material_1.TextField label="Run B ID" value={runB} onChange={(e) => setRunB(e.target.value)} placeholder="Enter second run ID" sx={{ flexGrow: 1 }}/>
            <material_1.Button variant="contained" onClick={() => void handleCompare()} disabled={loading || !runA || !runB}>
              Compare
            </material_1.Button>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>

      {/* Loading */}
      {loading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {/* Error */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </material_1.Alert>)}

      {/* Comparison Results */}
      {comparison && (<>
          {/* Summary Comparison */}
          <material_1.Card sx={{ mb: 3 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Summary
              </material_1.Typography>
              <material_1.Grid container spacing={2}>
                <material_1.Grid item xs={12} md={6}>
                  <material_1.Card variant="outlined">
                    <material_1.CardContent>
                      <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Run A
                      </material_1.Typography>
                      <material_1.Typography variant="h6">{comparison.run_a.run_type}</material_1.Typography>
                      <material_1.Typography variant="body2">{comparison.run_a.explanation.summary}</material_1.Typography>
                      <material_1.Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <material_1.Chip label={`Confidence: ${(comparison.run_a.confidence.overall_confidence * 100).toFixed(0)}%`} size="small"/>
                        <material_1.Chip label={`${comparison.run_a.actor.actor_name}`} size="small" variant="outlined"/>
                      </material_1.Stack>
                      <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Started: {formatTimestamp(comparison.run_a.started_at)}
                      </material_1.Typography>
                    </material_1.CardContent>
                  </material_1.Card>
                </material_1.Grid>

                <material_1.Grid item xs={12} md={6}>
                  <material_1.Card variant="outlined">
                    <material_1.CardContent>
                      <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Run B
                      </material_1.Typography>
                      <material_1.Typography variant="h6">{comparison.run_b.run_type}</material_1.Typography>
                      <material_1.Typography variant="body2">{comparison.run_b.explanation.summary}</material_1.Typography>
                      <material_1.Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <material_1.Chip label={`Confidence: ${(comparison.run_b.confidence.overall_confidence * 100).toFixed(0)}%`} size="small"/>
                        <material_1.Chip label={`${comparison.run_b.actor.actor_name}`} size="small" variant="outlined"/>
                      </material_1.Stack>
                      <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Started: {formatTimestamp(comparison.run_b.started_at)}
                      </material_1.Typography>
                    </material_1.CardContent>
                  </material_1.Card>
                </material_1.Grid>
              </material_1.Grid>
            </material_1.CardContent>
          </material_1.Card>

          {/* Deltas */}
          <material_1.Card sx={{ mb: 3 }}>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Deltas
              </material_1.Typography>

              <material_1.Table size="small">
                <material_1.TableBody>
                  <material_1.TableRow>
                    <material_1.TableCell>
                      <strong>Confidence Change</strong>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Stack direction="row" spacing={1} alignItems="center">
                        {getConfidenceTrend(comparison.deltas.confidence_delta)}
                        <material_1.Typography>
                          {comparison.deltas.confidence_delta > 0 ? '+' : ''}
                          {(comparison.deltas.confidence_delta * 100).toFixed(1)}%
                        </material_1.Typography>
                      </material_1.Stack>
                    </material_1.TableCell>
                  </material_1.TableRow>

                  {comparison.deltas.duration_delta_ms !== null && (<material_1.TableRow>
                      <material_1.TableCell>
                        <strong>Duration Change</strong>
                      </material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Stack direction="row" spacing={1} alignItems="center">
                          {getDurationTrend(comparison.deltas.duration_delta_ms)}
                          <material_1.Typography>
                            {comparison.deltas.duration_delta_ms > 0 ? '+' : ''}
                            {(comparison.deltas.duration_delta_ms / 1000).toFixed(2)}s
                          </material_1.Typography>
                        </material_1.Stack>
                      </material_1.TableCell>
                    </material_1.TableRow>)}

                  {comparison.deltas.different_capabilities.length > 0 && (<material_1.TableRow>
                      <material_1.TableCell>
                        <strong>Different Capabilities</strong>
                      </material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                          {comparison.deltas.different_capabilities.map((cap) => (<material_1.Chip key={cap} label={cap} size="small" variant="outlined"/>))}
                        </material_1.Stack>
                      </material_1.TableCell>
                    </material_1.TableRow>)}

                  {comparison.deltas.different_policies.length > 0 && (<material_1.TableRow>
                      <material_1.TableCell>
                        <strong>Different Policies</strong>
                      </material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                          {comparison.deltas.different_policies.map((policy) => (<material_1.Chip key={policy} label={policy} size="small" variant="outlined"/>))}
                        </material_1.Stack>
                      </material_1.TableCell>
                    </material_1.TableRow>)}
                </material_1.TableBody>
              </material_1.Table>
            </material_1.CardContent>
          </material_1.Card>

          {/* Input Differences */}
          {Object.keys(comparison.deltas.input_diff).length > 0 && (<material_1.Card sx={{ mb: 3 }}>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Input Differences
                </material_1.Typography>
                <material_1.Table size="small">
                  <material_1.TableBody>
                    {Object.entries(comparison.deltas.input_diff).map(([key, diff]) => (<material_1.TableRow key={key}>
                        <material_1.TableCell>
                          <strong>{key}</strong>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Grid container spacing={2}>
                            <material_1.Grid item xs={6}>
                              <material_1.Typography variant="caption" color="text.secondary">
                                Before (Run A)
                              </material_1.Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.before, null, 2)}
                              </pre>
                            </material_1.Grid>
                            <material_1.Grid item xs={6}>
                              <material_1.Typography variant="caption" color="text.secondary">
                                After (Run B)
                              </material_1.Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.after, null, 2)}
                              </pre>
                            </material_1.Grid>
                          </material_1.Grid>
                        </material_1.TableCell>
                      </material_1.TableRow>))}
                  </material_1.TableBody>
                </material_1.Table>
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Output Differences */}
          {Object.keys(comparison.deltas.output_diff).length > 0 && (<material_1.Card sx={{ mb: 3 }}>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Output Differences
                </material_1.Typography>
                <material_1.Table size="small">
                  <material_1.TableBody>
                    {Object.entries(comparison.deltas.output_diff).map(([key, diff]) => (<material_1.TableRow key={key}>
                        <material_1.TableCell>
                          <strong>{key}</strong>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Grid container spacing={2}>
                            <material_1.Grid item xs={6}>
                              <material_1.Typography variant="caption" color="text.secondary">
                                Before (Run A)
                              </material_1.Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.before, null, 2)}
                              </pre>
                            </material_1.Grid>
                            <material_1.Grid item xs={6}>
                              <material_1.Typography variant="caption" color="text.secondary">
                                After (Run B)
                              </material_1.Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.after, null, 2)}
                              </pre>
                            </material_1.Grid>
                          </material_1.Grid>
                        </material_1.TableCell>
                      </material_1.TableRow>))}
                  </material_1.TableBody>
                </material_1.Table>
              </material_1.CardContent>
            </material_1.Card>)}

          {/* No Differences */}
          {Object.keys(comparison.deltas.input_diff).length === 0 &&
                Object.keys(comparison.deltas.output_diff).length === 0 &&
                comparison.deltas.different_capabilities.length === 0 &&
                comparison.deltas.different_policies.length === 0 && (<material_1.Alert severity="info">
                Runs are identical in inputs, outputs, capabilities, and policies. Only temporal and
                confidence differences may exist.
              </material_1.Alert>)}
        </>)}

      {!comparison && !loading && !error && (<material_1.Alert severity="info">Enter two run IDs above to compare them.</material_1.Alert>)}
    </material_1.Box>);
};
exports.default = RunComparisonView;
