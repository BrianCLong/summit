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
exports.default = AttackHeatmapWidget;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const ATTACK_COVERAGE_QUERY = (0, client_2.gql) `
  query GetAttackCoverage(
    $timeRange: String!
    $filters: AttackCoverageFilters
  ) {
    attackCoverage(timeRange: $timeRange, filters: $filters) {
      tactics {
        id
        name
        techniques {
          id
          name
          subTechniques {
            id
            name
          }
          coverage {
            detectionRules
            alertCount
            severity
            lastDetected
            falsePositiveRate
          }
          alerts {
            count
            severity
            trend
          }
        }
      }
      summary {
        totalTechniques
        coveredTechniques
        coveragePercentage
        topTactics
        recentActivity
      }
    }
  }
`;
const MITRE_TACTICS = [
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact',
];
function AttackHeatmapWidget({ timeRange = '7d', height = 600, onTechniqueClick, }) {
    const [anchorEl, setAnchorEl] = (0, react_1.useState)(null);
    const [filterDialogOpen, setFilterDialogOpen] = (0, react_1.useState)(false);
    const [selectedFilters, setSelectedFilters] = (0, react_1.useState)({
        tactics: [],
        severity: [],
        hasAlerts: false,
    });
    const [selectedTechnique, setSelectedTechnique] = (0, react_1.useState)(null);
    const [techniqueDialogOpen, setTechniqueDialogOpen] = (0, react_1.useState)(false);
    const { data, loading, error } = (0, client_1.useQuery)(ATTACK_COVERAGE_QUERY, {
        variables: {
            timeRange,
            filters: selectedFilters,
        },
        pollInterval: 300000, // Refresh every 5 minutes
    });
    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleExport = () => {
        if (!data?.attackCoverage)
            return;
        const exportData = {
            timestamp: new Date().toISOString(),
            timeRange,
            summary: data.attackCoverage.summary,
            tactics: data.attackCoverage.tactics,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attack-coverage-${timeRange}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        handleMenuClose();
    };
    const getCoverageColor = (technique) => {
        const { coverage, alerts } = technique;
        if (alerts.count === 0 && coverage.detectionRules === 0) {
            return '#f5f5f5'; // No coverage
        }
        if (alerts.count > 0) {
            // Color based on alert severity and count
            const intensity = Math.min(alerts.count / 10, 1); // Cap at 10 alerts
            switch (alerts.severity) {
                case 'critical':
                    return `rgba(211, 47, 47, ${0.3 + intensity * 0.7})`;
                case 'high':
                    return `rgba(245, 124, 0, ${0.3 + intensity * 0.7})`;
                case 'medium':
                    return `rgba(255, 193, 7, ${0.3 + intensity * 0.7})`;
                default:
                    return `rgba(76, 175, 80, ${0.3 + intensity * 0.7})`;
            }
        }
        if (coverage.detectionRules > 0) {
            // Detection coverage only
            const intensity = Math.min(coverage.detectionRules / 5, 1);
            return `rgba(63, 81, 181, ${0.2 + intensity * 0.5})`;
        }
        return '#e0e0e0';
    };
    const getTechniqueTooltip = (technique) => {
        const { coverage, alerts } = technique;
        return (<material_1.Box>
        <material_1.Typography variant="subtitle2" gutterBottom>
          {technique.id}: {technique.name}
        </material_1.Typography>
        <material_1.Typography variant="body2">
          Detection Rules: {coverage.detectionRules}
        </material_1.Typography>
        <material_1.Typography variant="body2">Recent Alerts: {alerts.count}</material_1.Typography>
        {alerts.count > 0 && (<material_1.Typography variant="body2">
            Severity: {alerts.severity.toUpperCase()}
          </material_1.Typography>)}
        {coverage.lastDetected && (<material_1.Typography variant="body2">
            Last Detected:{' '}
            {new Date(coverage.lastDetected).toLocaleDateString()}
          </material_1.Typography>)}
        <material_1.Typography variant="body2">
          FP Rate: {(coverage.falsePositiveRate * 100).toFixed(1)}%
        </material_1.Typography>
      </material_1.Box>);
    };
    const handleTechniqueClick = (technique) => {
        setSelectedTechnique(technique);
        setTechniqueDialogOpen(true);
        if (onTechniqueClick) {
            onTechniqueClick(technique);
        }
    };
    const renderHeatmapCell = (technique, tacticIndex, techniqueIndex) => (<material_1.Tooltip key={`${technique.id}`} title={getTechniqueTooltip(technique)} arrow>
      <material_1.Box sx={{
            width: 40,
            height: 30,
            backgroundColor: getCoverageColor(technique),
            border: '1px solid #ddd',
            cursor: 'pointer',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            color: technique.alerts.count > 0 ? '#fff' : '#666',
            '&:hover': {
                transform: 'scale(1.1)',
                zIndex: 1,
                boxShadow: 2,
            },
        }} onClick={() => handleTechniqueClick(technique)}>
        {technique.alerts.count > 0 && technique.alerts.count}
        {technique.alerts.trend === 'up' && (<material_1.Box component="span" sx={{ fontSize: '8px', ml: 0.5 }}>
            ↗
          </material_1.Box>)}
      </material_1.Box>
    </material_1.Tooltip>);
    const renderLegend = () => (<material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mt: 2,
            flexWrap: 'wrap',
        }}>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">No Coverage</material_1.Typography>
      </material_1.Box>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(63, 81, 181, 0.5)',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">Detection Only</material_1.Typography>
      </material_1.Box>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">Low Alerts</material_1.Typography>
      </material_1.Box>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">Medium Alerts</material_1.Typography>
      </material_1.Box>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(245, 124, 0, 0.7)',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">High Alerts</material_1.Typography>
      </material_1.Box>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <material_1.Box sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(211, 47, 47, 0.7)',
            border: '1px solid #ddd',
        }}/>
        <material_1.Typography variant="caption">Critical Alerts</material_1.Typography>
      </material_1.Box>
    </material_1.Box>);
    if (loading) {
        return (<material_1.Card sx={{ height }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            ATT&CK Coverage Heatmap
          </material_1.Typography>
          <material_1.Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '50%',
            }}>
            <material_1.LinearProgress sx={{ width: '50%' }}/>
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>);
    }
    if (error) {
        return (<material_1.Card sx={{ height }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" color="error">
            Error Loading ATT&CK Coverage
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            {error.message}
          </material_1.Typography>
        </material_1.CardContent>
      </material_1.Card>);
    }
    const { tactics = [], summary = {} } = data?.attackCoverage || {};
    return (<>
      <material_1.Card sx={{ height }}>
        <material_1.CardContent>
          {/* Header */}
          <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
        }}>
            <material_1.Box>
              <material_1.Typography variant="h6">ATT&CK Coverage Heatmap</material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary">
                {summary.coveragePercentage}% technique coverage (
                {summary.coveredTechniques}/{summary.totalTechniques})
              </material_1.Typography>
            </material_1.Box>
            <material_1.Box>
              <material_1.IconButton onClick={handleMenuClick}>
                <icons_material_1.MoreVert />
              </material_1.IconButton>
              <material_1.Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <material_1.MenuItem onClick={() => setFilterDialogOpen(true)}>
                  <icons_material_1.FilterList sx={{ mr: 1 }}/>
                  Filter
                </material_1.MenuItem>
                <material_1.MenuItem onClick={handleExport}>
                  <icons_material_1.FileDownload sx={{ mr: 1 }}/>
                  Export Data
                </material_1.MenuItem>
              </material_1.Menu>
            </material_1.Box>
          </material_1.Box>

          {/* Summary Stats */}
          <Grid_1.default container spacing={2} sx={{ mb: 3 }}>
            <Grid_1.default xs={3}>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h4" color="primary">
                  {summary.totalTechniques || 0}
                </material_1.Typography>
                <material_1.Typography variant="caption">Total Techniques</material_1.Typography>
              </material_1.Box>
            </Grid_1.default>
            <Grid_1.default xs={3}>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h4" color="success.main">
                  {summary.coveredTechniques || 0}
                </material_1.Typography>
                <material_1.Typography variant="caption">Covered</material_1.Typography>
              </material_1.Box>
            </Grid_1.default>
            <Grid_1.default xs={3}>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h4" color="warning.main">
                  {summary.recentActivity || 0}
                </material_1.Typography>
                <material_1.Typography variant="caption">Recent Alerts</material_1.Typography>
              </material_1.Box>
            </Grid_1.default>
            <Grid_1.default xs={3}>
              <material_1.Box sx={{ textAlign: 'center' }}>
                <material_1.Typography variant="h4" color="info.main">
                  {(summary.coveragePercentage || 0).toFixed(0)}%
                </material_1.Typography>
                <material_1.Typography variant="caption">Coverage</material_1.Typography>
              </material_1.Box>
            </Grid_1.default>
          </Grid_1.default>

          {/* Heatmap Grid */}
          <material_1.Box sx={{ overflowX: 'auto', maxHeight: height - 200 }}>
            <material_1.Box sx={{ minWidth: 800 }}>
              {/* Tactic Headers */}
              <material_1.Box sx={{ display: 'flex', mb: 1 }}>
                <material_1.Box sx={{ width: 150 }}/> {/* Space for technique labels */}
                {MITRE_TACTICS.map((tactic, index) => (<material_1.Box key={tactic} sx={{
                width: 120,
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
                height: 60,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
            }}>
                    {tactic}
                  </material_1.Box>))}
              </material_1.Box>

              {/* Technique Rows */}
              {tactics.map((tactic) => tactic.techniques.map((technique, techIndex) => (<material_1.Box key={technique.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <material_1.Box sx={{
                width: 150,
                fontSize: '11px',
                pr: 1,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                        <material_1.Tooltip title={technique.name}>
                          <span>{technique.id}</span>
                        </material_1.Tooltip>
                      </material_1.Box>
                      {MITRE_TACTICS.map((tacticName, tacticIndex) => (<material_1.Box key={`${technique.id}-${tacticName}`} sx={{
                    width: 120,
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                          {tactic.name === tacticName ? (renderHeatmapCell(technique, tacticIndex, techIndex)) : (<material_1.Box sx={{ width: 40, height: 30 }}/>)}
                        </material_1.Box>))}
                    </material_1.Box>)))}
            </material_1.Box>
          </material_1.Box>

          {renderLegend()}
        </material_1.CardContent>
      </material_1.Card>

      {/* Technique Detail Dialog */}
      <material_1.Dialog open={techniqueDialogOpen} onClose={() => setTechniqueDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedTechnique && (<>
            <material_1.DialogTitle>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="h6">
                  {selectedTechnique.id}: {selectedTechnique.name}
                </material_1.Typography>
                <material_1.Chip size="small" label={selectedTechnique.alerts.severity} color={selectedTechnique.alerts.severity === 'critical'
                ? 'error'
                : selectedTechnique.alerts.severity === 'high'
                    ? 'warning'
                    : 'default'}/>
              </material_1.Box>
            </material_1.DialogTitle>
            <material_1.DialogContent>
              <Grid_1.default container spacing={2}>
                <Grid_1.default xs={6}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Detection Coverage
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    Rules: {selectedTechnique.coverage.detectionRules}
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    False Positive Rate:{' '}
                    {(selectedTechnique.coverage.falsePositiveRate * 100).toFixed(1)}
                    %
                  </material_1.Typography>
                  {selectedTechnique.coverage.lastDetected && (<material_1.Typography variant="body2">
                      Last Detection:{' '}
                      {new Date(selectedTechnique.coverage.lastDetected).toLocaleString()}
                    </material_1.Typography>)}
                </Grid_1.default>
                <Grid_1.default xs={6}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Alert Activity
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    Recent Alerts: {selectedTechnique.alerts.count}
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    Trend: {selectedTechnique.alerts.trend.toUpperCase()}
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    Severity: {selectedTechnique.alerts.severity.toUpperCase()}
                  </material_1.Typography>
                </Grid_1.default>
              </Grid_1.default>
            </material_1.DialogContent>
            <material_1.DialogActions>
              <material_1.Button onClick={() => setTechniqueDialogOpen(false)}>
                Close
              </material_1.Button>
              <material_1.Button variant="contained" startIcon={<icons_material_1.ZoomIn />}>
                View Details
              </material_1.Button>
            </material_1.DialogActions>
          </>)}
      </material_1.Dialog>

      {/* Filter Dialog */}
      <material_1.Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Filter ATT&CK Coverage</material_1.DialogTitle>
        <material_1.DialogContent>
          <Grid_1.default container spacing={2} sx={{ mt: 1 }}>
            <Grid_1.default xs={12}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Tactics</material_1.InputLabel>
                <material_1.Select multiple value={selectedFilters.tactics} onChange={(e) => setSelectedFilters({
            ...selectedFilters,
            tactics: e.target.value,
        })} renderValue={(selected) => (<material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (<material_1.Chip key={value} label={value} size="small"/>))}
                    </material_1.Box>)}>
                  {MITRE_TACTICS.map((tactic) => (<material_1.MenuItem key={tactic} value={tactic}>
                      {tactic}
                    </material_1.MenuItem>))}
                </material_1.Select>
              </material_1.FormControl>
            </Grid_1.default>
            <Grid_1.default xs={12}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Alert Severity</material_1.InputLabel>
                <material_1.Select multiple value={selectedFilters.severity} onChange={(e) => setSelectedFilters({
            ...selectedFilters,
            severity: e.target.value,
        })} renderValue={(selected) => (<material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (<material_1.Chip key={value} label={value} size="small"/>))}
                    </material_1.Box>)}>
                  {['low', 'medium', 'high', 'critical'].map((severity) => (<material_1.MenuItem key={severity} value={severity}>
                      {severity.toUpperCase()}
                    </material_1.MenuItem>))}
                </material_1.Select>
              </material_1.FormControl>
            </Grid_1.default>
          </Grid_1.default>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setFilterDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={() => {
            setFilterDialogOpen(false);
            // Trigger refetch with new filters
        }}>
            Apply Filters
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </>);
}
