"use strict";
/**
 * Compliance Dashboard
 *
 * Main dashboard for compliance analytics and audit readiness.
 *
 * SOC 2 Controls: CC2.1, CC3.1, CC4.1, PI1.1
 *
 * @module pages/Analytics/ComplianceDashboard
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
const useAnalytics_1 = require("../../../hooks/useAnalytics");
// ============================================================================
// Helper Components
// ============================================================================
const AuditReadinessGauge = ({ score }) => {
    const getColor = () => {
        if (score >= 80)
            return 'success.main';
        if (score >= 60)
            return 'warning.main';
        return 'error.main';
    };
    const getLabel = () => {
        if (score >= 80)
            return 'Ready';
        if (score >= 60)
            return 'Needs Work';
        return 'At Risk';
    };
    return (<material_1.Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <material_1.CircularProgress variant="determinate" value={score} size={160} thickness={6} sx={{ color: getColor() }}/>
      <material_1.Box sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
        <material_1.Typography variant="h3" component="div" fontWeight="bold">
          {score}%
        </material_1.Typography>
        <material_1.Typography variant="body2" color="text.secondary">
          {getLabel()}
        </material_1.Typography>
      </material_1.Box>
    </material_1.Box>);
};
const StatusIcon = ({ status }) => {
    switch (status) {
        case 'compliant':
            return <icons_material_1.CheckCircle color="success"/>;
        case 'partially_compliant':
            return <icons_material_1.Warning color="warning"/>;
        case 'non_compliant':
            return <icons_material_1.Error color="error"/>;
        default:
            return <icons_material_1.Help color="disabled"/>;
    }
};
const FrameworkCard = ({ displayName, percentage, total, compliant }) => {
    const getColor = () => {
        if (percentage >= 80)
            return 'success';
        if (percentage >= 60)
            return 'warning';
        return 'error';
    };
    return (<material_1.Card sx={{ height: '100%' }}>
      <material_1.CardContent>
        <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <material_1.Typography variant="h6">{displayName}</material_1.Typography>
          <material_1.Chip size="small" label={`${percentage}%`} color={getColor()}/>
        </material_1.Box>
        <material_1.LinearProgress variant="determinate" value={percentage} color={getColor()} sx={{ height: 8, borderRadius: 4, mb: 1 }}/>
        <material_1.Typography variant="body2" color="text.secondary">
          {compliant} of {total} controls compliant
        </material_1.Typography>
      </material_1.CardContent>
    </material_1.Card>);
};
// ============================================================================
// Main Component
// ============================================================================
const ComplianceDashboard = () => {
    const summary = (0, useAnalytics_1.useComplianceSummary)();
    const readiness = (0, useAnalytics_1.useAuditReadiness)();
    const frameworks = (0, useAnalytics_1.useFrameworkStatus)();
    const controls = (0, useAnalytics_1.useControlStatus)();
    const handleRefresh = (0, react_1.useCallback)(() => {
        summary.refresh();
        readiness.refresh();
        frameworks.refresh();
        controls.refresh();
    }, [summary, readiness, frameworks, controls]);
    const isLoading = summary.loading || readiness.loading || frameworks.loading;
    const hasError = summary.error || readiness.error || frameworks.error;
    return (<material_1.Box sx={{ p: 3 }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Box>
          <material_1.Typography variant="h4" component="h1">
            Compliance Dashboard
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            Monitor audit readiness, control status, and compliance health
          </material_1.Typography>
        </material_1.Box>
        <material_1.Tooltip title="Refresh">
          <material_1.IconButton onClick={handleRefresh} disabled={isLoading}>
            <icons_material_1.Refresh />
          </material_1.IconButton>
        </material_1.Tooltip>
      </material_1.Box>

      {isLoading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {hasError && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {summary.error || readiness.error || frameworks.error}
        </material_1.Alert>)}

      <material_1.Grid container spacing={3}>
        {/* Audit Readiness Score */}
        <material_1.Grid xs={12} md={4}>
          <material_1.Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Audit Readiness
            </material_1.Typography>
            <AuditReadinessGauge score={readiness.data?.overallScore || 0}/>
            <material_1.Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h5" color="primary">
                  {readiness.data?.controlCoverage || 0}%
                </material_1.Typography>
                <material_1.Typography variant="caption" color="text.secondary">
                  Control Coverage
                </material_1.Typography>
              </material_1.Box>
              <material_1.Divider orientation="vertical" flexItem/>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h5" color="primary">
                  {readiness.data?.evidenceCoverage || 0}%
                </material_1.Typography>
                <material_1.Typography variant="caption" color="text.secondary">
                  Evidence Coverage
                </material_1.Typography>
              </material_1.Box>
            </material_1.Box>
          </material_1.Paper>
        </material_1.Grid>

        {/* Control Status Summary */}
        <material_1.Grid xs={12} md={8}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Control Status
            </material_1.Typography>
            <material_1.Grid container spacing={2}>
              <material_1.Grid xs={6} sm={3}>
                <material_1.Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <material_1.CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <material_1.Typography variant="h4">
                      {summary.data?.controlsByStatus.compliant || 0}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">Compliant</material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>
              </material_1.Grid>
              <material_1.Grid item xs={6} sm={3}>
                <material_1.Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <material_1.CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <material_1.Typography variant="h4">
                      {summary.data?.controlsByStatus.partially_compliant || 0}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">Partial</material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>
              </material_1.Grid>
              <material_1.Grid item xs={6} sm={3}>
                <material_1.Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <material_1.CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <material_1.Typography variant="h4">
                      {summary.data?.controlsByStatus.non_compliant || 0}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">Non-Compliant</material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>
              </material_1.Grid>
              <material_1.Grid item xs={6} sm={3}>
                <material_1.Card sx={{ bgcolor: 'grey.300' }}>
                  <material_1.CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <material_1.Typography variant="h4">
                      {summary.data?.controlsByStatus.not_assessed || 0}
                    </material_1.Typography>
                    <material_1.Typography variant="body2">Not Assessed</material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>
              </material_1.Grid>
            </material_1.Grid>

            {/* Gaps Summary */}
            <material_1.Box sx={{ mt: 2 }}>
              <material_1.Alert severity={readiness.data?.criticalGaps === 0
            ? 'success'
            : readiness.data?.criticalGaps && readiness.data.criticalGaps > 3
                ? 'error'
                : 'warning'}>
                <material_1.Typography variant="body2">
                  {readiness.data?.gapCount || 0} total gaps identified
                  {readiness.data?.criticalGaps
            ? ` (${readiness.data.criticalGaps} critical)`
            : ''}
                </material_1.Typography>
              </material_1.Alert>
            </material_1.Box>
          </material_1.Paper>
        </material_1.Grid>

        {/* Framework Status */}
        <material_1.Grid item xs={12}>
          <material_1.Paper sx={{ p: 2 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Framework Compliance
            </material_1.Typography>
            <material_1.Grid container spacing={2}>
              {frameworks.data && frameworks.data.length > 0 ? (frameworks.data.map((fw) => (<material_1.Grid xs={12} sm={6} md={3} key={fw.framework}>
                    <FrameworkCard displayName={fw.displayName} percentage={fw.compliancePercentage} total={fw.totalControls} compliant={fw.compliantControls}/>
                  </material_1.Grid>))) : (<material_1.Grid xs={12}>
                  <material_1.Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No framework data available. Configure compliance frameworks to see status.
                  </material_1.Typography>
                </material_1.Grid>)}
            </material_1.Grid>
          </material_1.Paper>
        </material_1.Grid>

        {/* Evidence Status */}
        <material_1.Grid xs={12} md={6}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Evidence Status
            </material_1.Typography>
            {summary.data?.evidenceStatus ? (<material_1.Grid container spacing={2}>
                <material_1.Grid xs={6}>
                  <material_1.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <icons_material_1.Inventory sx={{ fontSize: 40, color: 'success.main', mb: 1 }}/>
                    <material_1.Typography variant="h4">{summary.data.evidenceStatus.current}</material_1.Typography>
                    <material_1.Typography variant="body2">Current</material_1.Typography>
                  </material_1.Box>
                </material_1.Grid>
                <material_1.Grid item xs={6}>
                  <material_1.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <icons_material_1.Timeline sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}/>
                    <material_1.Typography variant="h4">{summary.data.evidenceStatus.expiring}</material_1.Typography>
                    <material_1.Typography variant="body2">Expiring Soon</material_1.Typography>
                  </material_1.Box>
                </material_1.Grid>
                <material_1.Grid item xs={6}>
                  <material_1.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                    <icons_material_1.Error sx={{ fontSize: 40, color: 'error.main', mb: 1 }}/>
                    <material_1.Typography variant="h4">{summary.data.evidenceStatus.expired}</material_1.Typography>
                    <material_1.Typography variant="body2">Expired</material_1.Typography>
                  </material_1.Box>
                </material_1.Grid>
                <material_1.Grid item xs={6}>
                  <material_1.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.200', borderRadius: 2 }}>
                    <icons_material_1.Assignment sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}/>
                    <material_1.Typography variant="h4">{summary.data.evidenceStatus.total}</material_1.Typography>
                    <material_1.Typography variant="body2">Total</material_1.Typography>
                  </material_1.Box>
                </material_1.Grid>
              </material_1.Grid>) : (<material_1.Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No evidence data available
              </material_1.Typography>)}
          </material_1.Paper>
        </material_1.Grid>

        {/* Recommendations */}
        <material_1.Grid xs={12} md={6}>
          <material_1.Paper sx={{ p: 2, height: '100%' }}>
            <material_1.Typography variant="h6" gutterBottom>
              Recommendations
            </material_1.Typography>
            {readiness.data?.recommendations && readiness.data.recommendations.length > 0 ? (<material_1.List dense>
                {readiness.data.recommendations.map((rec, index) => (<material_1.ListItem key={index}>
                    <material_1.ListItemIcon>
                      <icons_material_1.Security color="primary"/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary={rec}/>
                  </material_1.ListItem>))}
              </material_1.List>) : (<material_1.Alert severity="success">
                No specific recommendations at this time. Keep up the good work!
              </material_1.Alert>)}
          </material_1.Paper>
        </material_1.Grid>

        {/* Control Details Table */}
        <material_1.Grid xs={12}>
          <material_1.Paper sx={{ p: 2 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Control Details
            </material_1.Typography>
            {controls.data && controls.data.length > 0 ? (<material_1.TableContainer>
                <material_1.Table size="small">
                  <material_1.TableHead>
                    <material_1.TableRow>
                      <material_1.TableCell>Control ID</material_1.TableCell>
                      <material_1.TableCell>Name</material_1.TableCell>
                      <material_1.TableCell>Framework</material_1.TableCell>
                      <material_1.TableCell>Status</material_1.TableCell>
                      <material_1.TableCell align="right">Evidence</material_1.TableCell>
                      <material_1.TableCell align="right">Gaps</material_1.TableCell>
                      <material_1.TableCell>Last Assessed</material_1.TableCell>
                    </material_1.TableRow>
                  </material_1.TableHead>
                  <material_1.TableBody>
                    {controls.data.slice(0, 10).map((control) => (<material_1.TableRow key={control.controlId}>
                        <material_1.TableCell>{control.controlId}</material_1.TableCell>
                        <material_1.TableCell>{control.controlName}</material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Chip size="small" label={control.framework.toUpperCase()}/>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusIcon status={control.status}/>
                            {control.status.replace('_', ' ')}
                          </material_1.Box>
                        </material_1.TableCell>
                        <material_1.TableCell align="right">{control.evidenceCount}</material_1.TableCell>
                        <material_1.TableCell align="right">
                          {control.gapCount > 0 ? (<material_1.Chip size="small" label={control.gapCount} color="error"/>) : ('-')}
                        </material_1.TableCell>
                        <material_1.TableCell>
                          {control.lastAssessed
                    ? new Date(control.lastAssessed).toLocaleDateString()
                    : 'Never'}
                        </material_1.TableCell>
                      </material_1.TableRow>))}
                  </material_1.TableBody>
                </material_1.Table>
              </material_1.TableContainer>) : (<material_1.Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No control data available. Configure compliance controls to see details.
              </material_1.Typography>)}
          </material_1.Paper>
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.default = ComplianceDashboard;
