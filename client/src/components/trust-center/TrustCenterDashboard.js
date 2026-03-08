"use strict";
/**
 * Trust Center Dashboard
 *
 * Main dashboard component for the Trust Center showing compliance status,
 * certifications, SLO metrics, and regulatory pack access.
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
exports.TrustCenterDashboard = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = material_1.Grid;
const icons_material_1 = require("@mui/icons-material");
// =============================================================================
// Helper Functions
// =============================================================================
const getStatusColor = (status) => {
    switch (status) {
        case 'operational':
        case 'active':
        case 'effective':
            return 'success';
        case 'degraded':
        case 'pending':
        case 'partially_effective':
            return 'warning';
        case 'partial_outage':
        case 'major_outage':
        case 'expired':
        case 'ineffective':
            return 'error';
        default:
            return 'info';
    }
};
const getStatusIcon = (status) => {
    switch (status) {
        case 'operational':
        case 'active':
            return <icons_material_1.CheckCircle color="success"/>;
        case 'degraded':
        case 'pending':
            return <icons_material_1.Warning color="warning"/>;
        case 'partial_outage':
        case 'major_outage':
        case 'expired':
            return <icons_material_1.Error color="error"/>;
        default:
            return <icons_material_1.CheckCircle color="info"/>;
    }
};
const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
};
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
const StatusCard = ({ title, value, subtitle, icon, status }) => {
    const colors = {
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
    };
    return (<material_1.Card sx={{ height: '100%' }}>
      <material_1.CardContent>
        <material_1.Box display="flex" alignItems="center" justifyContent="space-between">
          <material_1.Box>
            <material_1.Typography variant="body2" color="textSecondary">
              {title}
            </material_1.Typography>
            <material_1.Typography variant="h4" sx={{ color: colors[status], fontWeight: 'bold' }}>
              {value}
            </material_1.Typography>
            {subtitle && (<material_1.Typography variant="caption" color="textSecondary">
                {subtitle}
              </material_1.Typography>)}
          </material_1.Box>
          <material_1.Box sx={{ color: colors[status] }}>{icon}</material_1.Box>
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
};
const CertificationCard = ({ cert, onDownload }) => {
    return (<material_1.Card sx={{ height: '100%' }}>
      <material_1.CardContent>
        <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <material_1.Box display="flex" alignItems="center" gap={1}>
            <icons_material_1.VerifiedUser color={getStatusColor(cert.status)}/>
            <material_1.Typography variant="h6">{cert.name}</material_1.Typography>
          </material_1.Box>
          <material_1.Chip label={cert.status.toUpperCase()} color={getStatusColor(cert.status)} size="small"/>
        </material_1.Box>
        <material_1.Divider sx={{ my: 1 }}/>
        <material_1.Typography variant="body2" color="textSecondary">
          {cert.auditor && `Auditor: ${cert.auditor}`}
        </material_1.Typography>
        {cert.validUntil && (<material_1.Typography variant="body2" color="textSecondary">
            Valid until: {formatDate(cert.validUntil)}
          </material_1.Typography>)}
        {onDownload && (<material_1.Box mt={2}>
            <material_1.Button variant="outlined" size="small" startIcon={<icons_material_1.Download />} onClick={onDownload}>
              Download Certificate
            </material_1.Button>
          </material_1.Box>)}
      </material_1.CardContent>
    </material_1.Card>);
};
const SLOGauge = ({ label, current, target, unit = '%' }) => {
    const percentage = Math.min((current / target) * 100, 100);
    const isMet = current >= target;
    return (<material_1.Box mb={2}>
      <material_1.Box display="flex" justifyContent="space-between" mb={0.5}>
        <material_1.Typography variant="body2">{label}</material_1.Typography>
        <material_1.Typography variant="body2" color={isMet ? 'success.main' : 'error.main'}>
          {current}
          {unit} / {target}
          {unit}
        </material_1.Typography>
      </material_1.Box>
      <material_1.LinearProgress variant="determinate" value={percentage} color={isMet ? 'success' : 'error'} sx={{ height: 8, borderRadius: 4 }}/>
    </material_1.Box>);
};
// =============================================================================
// Main Component
// =============================================================================
const TrustCenterDashboard = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    const [packs, setPacks] = (0, react_1.useState)([]);
    // Fetch trust center data
    (0, react_1.useEffect)(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch status
                const statusRes = await fetch('/api/v1/trust/status');
                if (!statusRes.ok)
                    throw new Error('Failed to fetch status');
                const statusData = await statusRes.json();
                setData(statusData);
                // Fetch packs
                const packsRes = await fetch('/api/v1/trust/packs');
                if (!packsRes.ok)
                    throw new Error('Failed to fetch packs');
                const packsData = await packsRes.json();
                setPacks(packsData.packs || []);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (err) {
                setError(err.message);
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    const handleRefresh = () => {
        setLoading(true);
        setError(null);
        // Re-trigger fetch
        window.location.reload();
    };
    const handleDownloadReport = async (packId) => {
        try {
            const res = await fetch('/api/v1/trust/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId, format: 'pdf' }),
            });
            if (!res.ok)
                throw new Error('Failed to generate report');
            const report = await res.json();
            // Handle download
            // eslint-disable-next-line no-console
            console.log('Report generated:', report);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setError(err.message);
        }
    };
    if (loading) {
        return (<material_1.Box p={4}>
        <material_1.LinearProgress />
        <material_1.Typography variant="body1" align="center" mt={2}>
          Loading Trust Center...
        </material_1.Typography>
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Box p={4}>
        <material_1.Alert severity="error" action={<material_1.Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </material_1.Button>}>
          {error}
        </material_1.Alert>
      </material_1.Box>);
    }
    if (!data) {
        return null;
    }
    return (<material_1.Box p={3}>
      {/* Header */}
      <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <material_1.Box display="flex" alignItems="center" gap={2}>
          <icons_material_1.Shield fontSize="large" color="primary"/>
          <material_1.Box>
            <material_1.Typography variant="h4">Trust Center</material_1.Typography>
            <material_1.Typography variant="body2" color="textSecondary">
              Security, compliance, and privacy information
            </material_1.Typography>
          </material_1.Box>
        </material_1.Box>
        <material_1.Box display="flex" alignItems="center" gap={2}>
          <material_1.Chip icon={getStatusIcon(data.overallStatus)} label={data.overallStatus.replace('_', ' ').toUpperCase()} color={getStatusColor(data.overallStatus)}/>
          <material_1.Tooltip title="Refresh">
            <material_1.IconButton onClick={handleRefresh}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Box>
      </material_1.Box>

      {/* Status Overview Cards */}
      <AnyGrid container spacing={3} mb={3}>
        <AnyGrid xs={12} sm={6} md={3}>
          <StatusCard title="Availability (30d)" value={formatPercentage(data.uptime.last30d)} subtitle="Target: 99.9%" icon={<icons_material_1.CloudDone fontSize="large"/>} status={data.uptime.last30d >= 99.9 ? 'success' : 'warning'}/>
        </AnyGrid>
        <AnyGrid xs={12} sm={6} md={3}>
          <StatusCard title="Latency P95" value={`${data.sloSummary.latency.p95}ms`} subtitle={`Target: ${data.sloSummary.latency.target}ms`} icon={<icons_material_1.Speed fontSize="large"/>} status={data.sloSummary.latency.p95 <= data.sloSummary.latency.target ? 'success' : 'warning'}/>
        </AnyGrid>
        <AnyGrid xs={12} sm={6} md={3}>
          <StatusCard title="Active Certifications" value={String(data.certifications.filter(c => c.status === 'active').length)} subtitle={`${data.certifications.length} total`} icon={<icons_material_1.VerifiedUser fontSize="large"/>} status="success"/>
        </AnyGrid>
        <AnyGrid xs={12} sm={6} md={3}>
          <StatusCard title="Incidents (30d)" value={String(data.incidentCount)} icon={<icons_material_1.Assessment fontSize="large"/>} status={data.incidentCount === 0 ? 'success' : data.incidentCount < 3 ? 'warning' : 'error'}/>
        </AnyGrid>
      </AnyGrid>

      {/* Tabs */}
      <material_1.Paper sx={{ mb: 3 }}>
        <material_1.Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} indicatorColor="primary" textColor="primary">
          <material_1.Tab label="Certifications" icon={<icons_material_1.VerifiedUser />} iconPosition="start"/>
          <material_1.Tab label="SLO Metrics" icon={<icons_material_1.Timeline />} iconPosition="start"/>
          <material_1.Tab label="Regulatory Packs" icon={<icons_material_1.Security />} iconPosition="start"/>
        </material_1.Tabs>
      </material_1.Paper>

      {/* Tab Content */}
      {activeTab === 0 && (<AnyGrid container spacing={3}>
          {data.certifications.map((cert) => (<AnyGrid xs={12} sm={6} md={4} key={cert.framework}>
              <CertificationCard cert={cert} 
            // eslint-disable-next-line no-console
            onDownload={() => console.log('Download', cert.framework)}/>
            </AnyGrid>))}
        </AnyGrid>)}

      {activeTab === 1 && (<AnyGrid container spacing={3}>
          <AnyGrid xs={12} md={6}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Service Level Objectives
                </material_1.Typography>
                <SLOGauge label="Availability" current={data.sloSummary.availability.current} target={data.sloSummary.availability.target}/>
                <SLOGauge label="Latency P95" current={data.sloSummary.latency.target - data.sloSummary.latency.p95} target={data.sloSummary.latency.target} unit="ms buffer"/>
                <SLOGauge label="Error Rate (inverted)" current={data.sloSummary.errorRate.target - data.sloSummary.errorRate.current} target={data.sloSummary.errorRate.target}/>
              </material_1.CardContent>
            </material_1.Card>
          </AnyGrid>
          <AnyGrid xs={12} md={6}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Uptime History
                </material_1.Typography>
                <material_1.List>
                  <material_1.ListItem>
                    <material_1.ListItemIcon>
                      <icons_material_1.CheckCircle color={data.uptime.last24h >= 99.9 ? 'success' : 'warning'}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary="Last 24 Hours" secondary={formatPercentage(data.uptime.last24h)}/>
                  </material_1.ListItem>
                  <material_1.ListItem>
                    <material_1.ListItemIcon>
                      <icons_material_1.CheckCircle color={data.uptime.last7d >= 99.9 ? 'success' : 'warning'}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary="Last 7 Days" secondary={formatPercentage(data.uptime.last7d)}/>
                  </material_1.ListItem>
                  <material_1.ListItem>
                    <material_1.ListItemIcon>
                      <icons_material_1.CheckCircle color={data.uptime.last30d >= 99.9 ? 'success' : 'warning'}/>
                    </material_1.ListItemIcon>
                    <material_1.ListItemText primary="Last 30 Days" secondary={formatPercentage(data.uptime.last30d)}/>
                  </material_1.ListItem>
                </material_1.List>
              </material_1.CardContent>
            </material_1.Card>
          </AnyGrid>
        </AnyGrid>)}

      {activeTab === 2 && (<AnyGrid container spacing={3}>
          {packs.map((pack) => (<AnyGrid xs={12} sm={6} md={4} key={pack.id}>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <material_1.Typography variant="h6">{pack.name}</material_1.Typography>
                    <material_1.Chip label={pack.status.toUpperCase()} color={getStatusColor(pack.status)} size="small"/>
                  </material_1.Box>
                  <material_1.Typography variant="body2" color="textSecondary" gutterBottom>
                    {pack.framework.replace(/_/g, ' ')}
                  </material_1.Typography>
                  <material_1.Divider sx={{ my: 1 }}/>
                  <material_1.Typography variant="body2">
                    Controls: {pack.controlCount}
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="textSecondary">
                    Version: {pack.version}
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="textSecondary">
                    Updated: {formatDate(pack.lastUpdated)}
                  </material_1.Typography>
                  <material_1.Box mt={2} display="flex" gap={1}>
                    <material_1.Button variant="outlined" size="small" 
            // eslint-disable-next-line no-console
            onClick={() => console.log('View pack', pack.id)}>
                      View Details
                    </material_1.Button>
                    <material_1.Button variant="contained" size="small" startIcon={<icons_material_1.Download />} onClick={() => handleDownloadReport(pack.id)}>
                      Report
                    </material_1.Button>
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>
            </AnyGrid>))}
        </AnyGrid>)}

      {/* Footer */}
      <material_1.Box mt={4} pt={2} borderTop={1} borderColor="divider">
        <material_1.Typography variant="body2" color="textSecondary" align="center">
          Last updated: {formatDate(data.lastUpdated)} |{' '}
          <a href="/docs/compliance/trust-center-regulatory-packs-v0.md" style={{ color: 'inherit' }}>
            Documentation
          </a>{' '}
          |{' '}
          <a href="mailto:security@company.io" style={{ color: 'inherit' }}>
            Contact Security Team
          </a>
        </material_1.Typography>
      </material_1.Box>
    </material_1.Box>);
};
exports.TrustCenterDashboard = TrustCenterDashboard;
exports.default = exports.TrustCenterDashboard;
