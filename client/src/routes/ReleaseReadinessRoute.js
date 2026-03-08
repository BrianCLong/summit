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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AuthContext_1 = require("../context/AuthContext");
const CACHE_KEY_SUMMARY = 'release-readiness-summary';
const CACHE_KEY_EVIDENCE = 'release-readiness-evidence';
const CACHE_KEY_TIMESTAMP = 'release-readiness-timestamp';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const getErrorMessage = (err) => {
    if (err instanceof Error)
        return err.message;
    return 'Failed to load data';
};
function ReleaseReadinessRoute() {
    const { hasRole } = (0, AuthContext_1.useAuth)();
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [summary, setSummary] = (0, react_1.useState)(null);
    const [evidenceIndex, setEvidenceIndex] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [isOffline, setIsOffline] = (0, react_1.useState)(false);
    const [isStale, setIsStale] = (0, react_1.useState)(false);
    const [snackbarOpen, setSnackbarOpen] = (0, react_1.useState)(false);
    const [snackbarMessage, setSnackbarMessage] = (0, react_1.useState)('');
    const hasAccess = Boolean(hasRole && (hasRole('ADMIN') || hasRole('OPERATOR')));
    // Load from cache
    const loadFromCache = (0, react_1.useCallback)(() => {
        try {
            const cachedSummary = localStorage.getItem(CACHE_KEY_SUMMARY);
            const cachedEvidence = localStorage.getItem(CACHE_KEY_EVIDENCE);
            const cachedTimestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
            if (cachedSummary && cachedEvidence && cachedTimestamp) {
                const timestamp = parseInt(cachedTimestamp, 10);
                const age = Date.now() - timestamp;
                setSummary(JSON.parse(cachedSummary));
                setEvidenceIndex(JSON.parse(cachedEvidence));
                if (age > CACHE_EXPIRY) {
                    setIsStale(true);
                }
                return true;
            }
        }
        catch (err) {
            console.error('Failed to load from cache:', err);
        }
        return false;
    }, []);
    // Save to cache
    const saveToCache = (0, react_1.useCallback)((summaryData, evidenceData) => {
        try {
            localStorage.setItem(CACHE_KEY_SUMMARY, JSON.stringify(summaryData));
            localStorage.setItem(CACHE_KEY_EVIDENCE, JSON.stringify(evidenceData));
            localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
        }
        catch (err) {
            console.error('Failed to save to cache:', err);
        }
    }, []);
    // Fetch data from API
    const fetchData = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        setIsOffline(false);
        try {
            // Fetch summary and evidence index in parallel
            const [summaryRes, evidenceRes] = await Promise.all([
                fetch('/api/ops/release-readiness/summary', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch('/api/ops/release-readiness/evidence-index', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);
            if (!summaryRes.ok || !evidenceRes.ok) {
                throw new Error('Failed to fetch release readiness data');
            }
            const summaryData = await summaryRes.json();
            const evidenceData = await evidenceRes.json();
            setSummary(summaryData);
            setEvidenceIndex(evidenceData);
            saveToCache(summaryData, evidenceData);
            setIsStale(false);
        }
        catch (err) {
            setError(getErrorMessage(err));
            setIsOffline(true);
            // Try loading from cache on error
            if (!loadFromCache()) {
                setError('Failed to load data and no cached data available');
            }
        }
        finally {
            setLoading(false);
        }
    }, [loadFromCache, saveToCache]);
    // Initial load
    (0, react_1.useEffect)(() => {
        if (!hasAccess) {
            setLoading(false);
            return;
        }
        // Try loading from cache first
        const hasCache = loadFromCache();
        if (hasCache) {
            setLoading(false);
            // Fetch fresh data in background
            fetchData();
        }
        else {
            // No cache, fetch now
            fetchData();
        }
    }, [fetchData, hasAccess, loadFromCache]);
    // Copy to clipboard helper
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setSnackbarMessage('Copied to clipboard');
            setSnackbarOpen(true);
        }).catch(() => {
            setSnackbarMessage('Failed to copy');
            setSnackbarOpen(true);
        });
    };
    // Get status icon and color
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pass':
                return <icons_material_1.CheckCircle sx={{ color: 'success.main' }}/>;
            case 'fail':
                return <icons_material_1.Error sx={{ color: 'error.main' }}/>;
            case 'warn':
                return <icons_material_1.Warning sx={{ color: 'warning.main' }}/>;
            default:
                return <icons_material_1.Help sx={{ color: 'grey.500' }}/>;
        }
    };
    if (!hasAccess) {
        return (<material_1.Box p={3}>
        <material_1.Alert severity="error">
          You do not have permission to view this page. Admin or Operator role required.
        </material_1.Alert>
      </material_1.Box>);
    }
    const getStatusColor = (status) => {
        switch (status) {
            case 'pass':
                return 'success';
            case 'fail':
                return 'error';
            case 'warn':
                return 'warning';
            default:
                return 'default';
        }
    };
    // Calculate overall status
    const getOverallStatus = () => {
        if (!summary)
            return 'unknown';
        const failCount = summary.checks.filter(c => c.status === 'fail').length;
        const warnCount = summary.checks.filter(c => c.status === 'warn').length;
        if (failCount > 0)
            return 'fail';
        if (warnCount > 0)
            return 'warn';
        return 'pass';
    };
    // Loading state
    if (loading && !summary) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <material_1.Stack alignItems="center" spacing={2}>
          <material_1.CircularProgress />
          <material_1.Typography>Loading release readiness data...</material_1.Typography>
        </material_1.Stack>
      </material_1.Box>);
    }
    // Error state (no cache)
    if (error && !summary) {
        return (<material_1.Box p={3}>
        <material_1.Alert severity="error" action={<material_1.Button color="inherit" size="small" onClick={fetchData}>
            Retry
          </material_1.Button>}>
          {error}
        </material_1.Alert>
      </material_1.Box>);
    }
    const overallStatus = getOverallStatus();
    return (<material_1.Box p={3}>
      <material_1.Stack spacing={3}>
        {/* Header */}
        <material_1.Box display="flex" justifyContent="space-between" alignItems="center">
          <material_1.Typography variant="h4" component="h1">
            Release Readiness & Evidence Explorer
          </material_1.Typography>
          <material_1.Stack direction="row" spacing={1}>
            {isOffline && (<material_1.Tooltip title="Showing cached data - offline or failed to fetch">
                <icons_material_1.CloudOff color="warning"/>
              </material_1.Tooltip>)}
            {isStale && !isOffline && (<material_1.Chip label="Stale" size="small" color="warning" icon={<icons_material_1.Warning />}/>)}
            <material_1.IconButton onClick={fetchData} disabled={loading} aria-label="Refresh data">
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Stack>
        </material_1.Box>

        {/* Offline/Stale Warning */}
        {(isOffline || isStale) && (<material_1.Alert severity={isOffline ? 'warning' : 'info'} action={<material_1.Button color="inherit" size="small" onClick={fetchData}>
                Refresh
              </material_1.Button>}>
            {isOffline
                ? 'Showing cached data - unable to connect to server'
                : `Data is stale (last updated: ${summary ? new Date(summary.generatedAt).toLocaleString() : 'unknown'})`}
          </material_1.Alert>)}

        {/* Summary Card */}
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Stack spacing={2}>
              <material_1.Typography variant="h6">Overall Status</material_1.Typography>
              <material_1.Box display="flex" alignItems="center" gap={2}>
                {getStatusIcon(overallStatus)}
                <material_1.Chip label={overallStatus.toUpperCase()} color={getStatusColor(overallStatus)} size="medium"/>
              </material_1.Box>
              <material_1.Stack direction="row" spacing={3}>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Version/Commit
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    {summary?.versionOrCommit || 'unknown'}
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Generated At
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    {summary ? new Date(summary.generatedAt).toLocaleString() : 'unknown'}
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Total Checks
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    {summary?.checks.length || 0}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Stack>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>

        {/* Tabs */}
        <material_1.Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="Release readiness tabs">
          <material_1.Tab label="Checks"/>
          <material_1.Tab label="Evidence Explorer"/>
        </material_1.Tabs>

        {/* Checks Tab */}
        {activeTab === 0 && (<material_1.Stack spacing={2}>
            <material_1.Typography variant="h6">Readiness Checks</material_1.Typography>
            {summary?.checks.length === 0 ? (<material_1.Alert severity="info">No checks available</material_1.Alert>) : (summary?.checks.map((check) => (<material_1.Accordion key={check.id}>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />} aria-controls={`${check.id}-content`} id={`${check.id}-header`}>
                    <material_1.Box display="flex" alignItems="center" gap={2} width="100%">
                      {getStatusIcon(check.status)}
                      <material_1.Typography sx={{ flexGrow: 1 }}>{check.name}</material_1.Typography>
                      <material_1.Chip label={check.status} color={getStatusColor(check.status)} size="small"/>
                    </material_1.Box>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <material_1.Stack spacing={2}>
                      {check.lastRunAt && (<material_1.Typography variant="body2" color="text.secondary">
                          Last checked: {new Date(check.lastRunAt).toLocaleString()}
                        </material_1.Typography>)}
                      {check.evidenceLinks && check.evidenceLinks.length > 0 && (<material_1.Box>
                          <material_1.Typography variant="subtitle2">Evidence:</material_1.Typography>
                          {check.evidenceLinks.map((link, i) => (<material_1.Typography key={i} variant="body2" component="code" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              {link}
                            </material_1.Typography>))}
                        </material_1.Box>)}
                    </material_1.Stack>
                  </material_1.AccordionDetails>
                </material_1.Accordion>)))}
          </material_1.Stack>)}

        {/* Evidence Explorer Tab */}
        {activeTab === 1 && (<material_1.Stack spacing={3}>
            <material_1.Typography variant="h6">Controls & Evidence</material_1.Typography>

            {/* Controls Table */}
            {evidenceIndex && evidenceIndex.controls.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle1" gutterBottom>
                  Controls
                </material_1.Typography>
                <material_1.TableContainer component={material_1.Paper}>
                  <material_1.Table size="small" aria-label="Controls table">
                    <material_1.TableHead>
                      <material_1.TableRow>
                        <material_1.TableCell>Control ID</material_1.TableCell>
                        <material_1.TableCell>Name</material_1.TableCell>
                        <material_1.TableCell>Description</material_1.TableCell>
                        <material_1.TableCell>Enforcement Point</material_1.TableCell>
                      </material_1.TableRow>
                    </material_1.TableHead>
                    <material_1.TableBody>
                      {evidenceIndex.controls.map((control) => (<material_1.TableRow key={control.id}>
                          <material_1.TableCell>
                            <material_1.Typography variant="body2" component="code" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {control.id}
                            </material_1.Typography>
                          </material_1.TableCell>
                          <material_1.TableCell>{control.name}</material_1.TableCell>
                          <material_1.TableCell>{control.description}</material_1.TableCell>
                          <material_1.TableCell>{control.enforcementPoint}</material_1.TableCell>
                        </material_1.TableRow>))}
                    </material_1.TableBody>
                  </material_1.Table>
                </material_1.TableContainer>
              </material_1.Box>)}

            {/* Evidence Items */}
            {evidenceIndex && evidenceIndex.evidence.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle1" gutterBottom>
                  Evidence Items
                </material_1.Typography>
                <material_1.Stack spacing={2}>
                  {evidenceIndex.evidence.map((item, index) => (<material_1.Card key={`${item.controlId}-${index}`} variant="outlined">
                      <material_1.CardContent>
                        <material_1.Stack spacing={1}>
                          <material_1.Box display="flex" alignItems="center" gap={1}>
                            <material_1.Chip label={item.controlId} size="small"/>
                            <material_1.Typography variant="body2" fontWeight="bold">
                              {item.controlName}
                            </material_1.Typography>
                          </material_1.Box>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Type: {item.evidenceType}
                          </material_1.Typography>
                          <material_1.Typography variant="body2">
                            Location: <code>{item.location}</code>
                          </material_1.Typography>
                          <material_1.Box>
                            <material_1.Typography variant="caption" color="text.secondary">
                              Verification Command:
                            </material_1.Typography>
                            <material_1.Box sx={{
                        backgroundColor: 'grey.900',
                        color: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                              <material_1.Typography component="code" sx={{ fontFamily: 'monospace', color: 'inherit' }}>
                                {item.verificationCommand}
                              </material_1.Typography>
                              <material_1.IconButton size="small" onClick={() => copyToClipboard(item.verificationCommand)} sx={{ color: 'grey.100' }} aria-label="Copy verification command">
                                <icons_material_1.ContentCopy fontSize="small"/>
                              </material_1.IconButton>
                            </material_1.Box>
                          </material_1.Box>
                        </material_1.Stack>
                      </material_1.CardContent>
                    </material_1.Card>))}
                </material_1.Stack>
              </material_1.Box>)}

            {(!evidenceIndex || (evidenceIndex.controls.length === 0 && evidenceIndex.evidence.length === 0)) && (<material_1.Alert severity="info">No evidence data available</material_1.Alert>)}
          </material_1.Stack>)}
      </material_1.Stack>

      {/* Snackbar for copy notifications */}
      <material_1.Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} message={snackbarMessage}/>
    </material_1.Box>);
}
exports.default = ReleaseReadinessRoute;
