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
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const GAReleaseStatus = () => {
    const [releaseInfo, setReleaseInfo] = (0, react_1.useState)(null);
    const [deploymentStatus, setDeploymentStatus] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchReleaseData();
    }, []);
    const fetchReleaseData = async () => {
        try {
            setLoading(true);
            const [infoResponse, statusResponse] = await Promise.all([
                fetch('/api/ga-release/info'),
                fetch('/api/ga-release/status'),
            ]);
            if (!infoResponse.ok || !statusResponse.ok) {
                throw new Error('Failed to fetch release data');
            }
            const infoData = await infoResponse.json();
            const statusData = await statusResponse.json();
            setReleaseInfo(infoData.data);
            setDeploymentStatus(statusData.data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    };
    const generateSBOM = async () => {
        try {
            const response = await fetch('/api/ga-release/generate-sbom', {
                method: 'POST',
            });
            if (response.ok) {
                // Refresh status after SBOM generation
                fetchReleaseData();
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }
        catch (err) {
            setError('Failed to generate SBOM');
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pass':
                return <icons_material_1.CheckCircle color="success"/>;
            case 'fail':
                return <icons_material_1.Error color="error"/>;
            case 'warning':
                return <icons_material_1.Warning color="warning"/>;
            default:
                return <icons_material_1.Info color="info"/>;
        }
    };
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Box p={2}>
        <material_1.Typography color="error">Error: {error}</material_1.Typography>
        <material_1.Button onClick={fetchReleaseData} variant="outlined" sx={{ mt: 1 }}>
          Retry
        </material_1.Button>
      </material_1.Box>);
    }
    return (<material_1.Box p={2}>
      <material_1.Typography variant="h4" gutterBottom>
        <icons_material_1.Rocket sx={{ mr: 1, verticalAlign: 'middle' }}/>
        GA Release Status
      </material_1.Typography>

      <Grid_1.default container spacing={3}>
        {/* Release Information */}
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Release Information
              </material_1.Typography>
              {releaseInfo && (<material_1.Box>
                  <material_1.Typography>
                    <strong>Version:</strong> {releaseInfo.version}
                  </material_1.Typography>
                  <material_1.Typography>
                    <strong>Environment:</strong> {releaseInfo.environment}
                  </material_1.Typography>
                  <material_1.Typography>
                    <strong>Commit:</strong>{' '}
                    {releaseInfo.commitHash.substring(0, 8)}
                  </material_1.Typography>
                  <material_1.Typography>
                    <strong>Build Date:</strong>{' '}
                    {new Date(releaseInfo.buildDate).toLocaleString()}
                  </material_1.Typography>

                  <material_1.Box mt={2}>
                    <material_1.Chip label={releaseInfo.ready ? 'Ready for Deployment' : 'Not Ready'} color={releaseInfo.ready ? 'success' : 'warning'} icon={releaseInfo.ready ? <icons_material_1.CheckCircle /> : <icons_material_1.Warning />}/>
                  </material_1.Box>

                  <material_1.Box mt={2}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Features:
                    </material_1.Typography>
                    <material_1.Box display="flex" flexWrap="wrap" gap={1}>
                      {releaseInfo.features.map((feature) => (<material_1.Chip key={feature} label={feature} size="small" variant="outlined"/>))}
                    </material_1.Box>
                  </material_1.Box>
                </material_1.Box>)}
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {/* Deployment Status */}
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6" gutterBottom>
                Deployment Validation
              </material_1.Typography>
              {deploymentStatus && (<material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Chip label={deploymentStatus.ready
                ? 'Validation Passed'
                : 'Validation Issues'} color={deploymentStatus.ready ? 'success' : 'error'}/>
                  </material_1.Box>

          <Grid_1.default container spacing={1} mb={2}>
            <Grid_1.default xs={6}>
                      <material_1.Chip label={`Tests: ${deploymentStatus.testsPass ? 'Pass' : 'Fail'}`} color={deploymentStatus.testsPass ? 'success' : 'error'} size="small"/>
                    </Grid_1.default>
            <Grid_1.default xs={6}>
                      <material_1.Chip label={`SBOM: ${deploymentStatus.sbomGenerated ? 'Generated' : 'Missing'}`} color={deploymentStatus.sbomGenerated ? 'success' : 'warning'} size="small"/>
                    </Grid_1.default>
                  </Grid_1.default>

                  {!deploymentStatus.sbomGenerated && (<material_1.Button onClick={generateSBOM} variant="outlined" size="small" startIcon={<icons_material_1.Build />} sx={{ mb: 2 }}>
                      Generate SBOM
                    </material_1.Button>)}

                  <material_1.List dense>
                    {deploymentStatus.validations.map((validation, index) => (<material_1.ListItem key={index}>
                        <material_1.ListItemIcon>
                          {getStatusIcon(validation.status)}
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary={validation.component} secondary={validation.message}/>
                      </material_1.ListItem>))}
                  </material_1.List>
                </material_1.Box>)}
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>
    </material_1.Box>);
};
exports.default = GAReleaseStatus;
