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
exports.EvidenceExportDialog = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const EvidenceExportDialog = ({ open, onClose, runId, nodeId, }) => {
    const [activeStep, setActiveStep] = (0, react_1.useState)(0);
    const [options, setOptions] = (0, react_1.useState)({
        format: 'json',
        includeArtifacts: true,
        includeSBOM: true,
        includeAttestations: true,
        signBundle: true,
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [exportResult, setExportResult] = (0, react_1.useState)(null);
    const [verification, setVerification] = (0, react_1.useState)(null);
    const handleExport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/maestro/v1/evidence/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    runId,
                    nodeId,
                    format: options.format,
                    includeArtifacts: options.includeArtifacts,
                    sign: options.signBundle,
                }),
            });
            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }
            const result = await response.json();
            setExportResult(result);
            setActiveStep(2);
            // Auto-verify if signed
            if (result.signature) {
                await handleVerify(result.evidenceId, result.signature, result.hash);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        }
        finally {
            setLoading(false);
        }
    };
    const handleVerify = async (evidenceId, signature, expectedHash) => {
        const id = evidenceId || exportResult?.evidenceId;
        if (!id)
            return;
        try {
            const response = await fetch(`/api/maestro/v1/evidence/${id}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature: signature || exportResult?.signature,
                    expectedHash: expectedHash || exportResult?.hash,
                }),
            });
            if (!response.ok) {
                throw new Error(`Verification failed: ${response.statusText}`);
            }
            const result = await response.json();
            setVerification(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
        }
    };
    const handleDownload = async () => {
        if (!exportResult?.downloadUrl)
            return;
        try {
            const response = await fetch(exportResult.downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `evidence-${runId}-${Date.now()}.${options.format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        }
    };
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Could show a toast notification here
        });
    };
    const renderConfigurationStep = () => (<material_1.Box sx={{ p: 2 }}>
      <material_1.FormControl component="fieldset" sx={{ mb: 3 }}>
        <material_1.FormLabel component="legend">Export Format</material_1.FormLabel>
        <material_1.RadioGroup value={options.format} onChange={(e) => setOptions({
            ...options,
            format: e.target.value,
        })} row>
          <material_1.FormControlLabel value="json" control={<material_1.Radio />} label="JSON"/>
          <material_1.FormControlLabel value="yaml" control={<material_1.Radio />} label="YAML"/>
          <material_1.FormControlLabel value="zip" control={<material_1.Radio />} label="ZIP Bundle"/>
        </material_1.RadioGroup>
      </material_1.FormControl>

      <material_1.Box sx={{ mb: 3 }}>
        <material_1.Typography variant="subtitle2" gutterBottom>
          Include Components
        </material_1.Typography>
        <material_1.FormControlLabel control={<material_1.Checkbox checked={options.includeArtifacts} onChange={(e) => setOptions({ ...options, includeArtifacts: e.target.checked })}/>} label="Artifacts (logs, configs, outputs)"/>
        <material_1.FormControlLabel control={<material_1.Checkbox checked={options.includeSBOM} onChange={(e) => setOptions({ ...options, includeSBOM: e.target.checked })}/>} label="Software Bill of Materials (SBOM)"/>
        <material_1.FormControlLabel control={<material_1.Checkbox checked={options.includeAttestations} onChange={(e) => setOptions({
                ...options,
                includeAttestations: e.target.checked,
            })}/>} label="Security Attestations"/>
        <material_1.FormControlLabel control={<material_1.Checkbox checked={options.signBundle} onChange={(e) => setOptions({ ...options, signBundle: e.target.checked })}/>} label="Digital Signature"/>
      </material_1.Box>

      <material_1.Alert severity="info" sx={{ mb: 2 }}>
        <material_1.Typography variant="body2">
          <strong>Evidence Bundle Contents:</strong>
        </material_1.Typography>
        <material_1.Typography variant="body2">
          • Decision trace and routing information
        </material_1.Typography>
        <material_1.Typography variant="body2">• Input parameters and context</material_1.Typography>
        <material_1.Typography variant="body2">• Output results and metadata</material_1.Typography>
        {options.includeArtifacts && (<material_1.Typography variant="body2">
            • Execution artifacts and logs
          </material_1.Typography>)}
        {options.signBundle && (<material_1.Typography variant="body2">
            • Cryptographic signature for integrity verification
          </material_1.Typography>)}
      </material_1.Alert>

      <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <material_1.Button onClick={onClose}>Cancel</material_1.Button>
        <material_1.Button variant="contained" onClick={() => setActiveStep(1)} startIcon={<icons_material_1.FolderZipOutlined />}>
          Configure Export
        </material_1.Button>
      </material_1.Box>
    </material_1.Box>);
    const renderGenerationStep = () => (<material_1.Box sx={{ p: 2 }}>
      <material_1.Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <material_1.Typography variant="h6" gutterBottom>
          Export Configuration
        </material_1.Typography>
        <material_1.Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <material_1.Box>
            <material_1.Typography variant="subtitle2">Run ID:</material_1.Typography>
            <material_1.Typography variant="body2" fontFamily="monospace">
              {runId}
            </material_1.Typography>
          </material_1.Box>
          {nodeId && (<material_1.Box>
              <material_1.Typography variant="subtitle2">Node ID:</material_1.Typography>
              <material_1.Typography variant="body2" fontFamily="monospace">
                {nodeId}
              </material_1.Typography>
            </material_1.Box>)}
          <material_1.Box>
            <material_1.Typography variant="subtitle2">Format:</material_1.Typography>
            <material_1.Chip label={options.format.toUpperCase()} size="small"/>
          </material_1.Box>
          <material_1.Box>
            <material_1.Typography variant="subtitle2">Signature:</material_1.Typography>
            <material_1.Chip label={options.signBundle ? 'Enabled' : 'Disabled'} size="small" color={options.signBundle ? 'success' : 'default'}/>
          </material_1.Box>
        </material_1.Box>
      </material_1.Paper>

      {loading && (<material_1.Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 3,
            }}>
          <material_1.CircularProgress sx={{ mb: 2 }}/>
          <material_1.Typography variant="body2">Generating evidence bundle...</material_1.Typography>
        </material_1.Box>)}

      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}

      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <material_1.Button onClick={() => setActiveStep(0)}>Back</material_1.Button>
        <material_1.Button variant="contained" onClick={handleExport} disabled={loading} startIcon={loading ? <material_1.CircularProgress size={16}/> : <icons_material_1.ArticleOutlined />}>
          {loading ? 'Generating...' : 'Generate Bundle'}
        </material_1.Button>
      </material_1.Box>
    </material_1.Box>);
    const renderVerificationStep = () => (<material_1.Box sx={{ p: 2 }}>
      {exportResult && (<>
          <material_1.Alert severity="success" sx={{ mb: 2 }}>
            <material_1.Typography variant="body2">
              <strong>Evidence bundle generated successfully!</strong>
            </material_1.Typography>
          </material_1.Alert>

          <material_1.Paper sx={{ p: 2, mb: 2 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Bundle Information
            </material_1.Typography>

            <material_1.Box sx={{ mb: 2 }}>
              <material_1.Typography variant="subtitle2">Evidence ID:</material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="body2" fontFamily="monospace">
                  {exportResult.evidenceId}
                </material_1.Typography>
                <material_1.IconButton size="small" onClick={() => handleCopyToClipboard(exportResult.evidenceId)}>
                  <icons_material_1.ContentCopyOutlined fontSize="small"/>
                </material_1.IconButton>
              </material_1.Box>
            </material_1.Box>

            <material_1.Box sx={{ mb: 2 }}>
              <material_1.Typography variant="subtitle2">Content Hash:</material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                  {exportResult.hash}
                </material_1.Typography>
                <material_1.IconButton size="small" onClick={() => handleCopyToClipboard(exportResult.hash)}>
                  <icons_material_1.ContentCopyOutlined fontSize="small"/>
                </material_1.IconButton>
              </material_1.Box>
            </material_1.Box>

            {exportResult.signature && (<material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2">Digital Signature:</material_1.Typography>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <material_1.Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {exportResult.signature.substring(0, 64)}...
                  </material_1.Typography>
                  <material_1.IconButton size="small" onClick={() => handleCopyToClipboard(exportResult.signature || '')}>
                    <icons_material_1.ContentCopyOutlined fontSize="small"/>
                  </material_1.IconButton>
                </material_1.Box>
              </material_1.Box>)}
          </material_1.Paper>

          {verification && (<material_1.Paper sx={{ p: 2, mb: 2 }}>
              <material_1.Typography variant="h6" gutterBottom>
                Verification Status
              </material_1.Typography>

              <material_1.Alert severity={verification.valid ? 'success' : 'error'} sx={{ mb: 2 }}>
                <material_1.Typography variant="body2">
                  <strong>Overall Status:</strong>{' '}
                  {verification.valid ? 'Valid' : 'Invalid'}
                </material_1.Typography>
              </material_1.Alert>

              <material_1.List dense>
                <material_1.ListItem>
                  <material_1.ListItemIcon>
                    {verification.verification.checks.hashMatch ? (<icons_material_1.CheckCircleOutlined color="success"/>) : (<icons_material_1.WarningAmberOutlined color="error"/>)}
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Hash Integrity" secondary={verification.verification.checks.hashMatch
                    ? 'Content verified'
                    : 'Hash mismatch'}/>
                </material_1.ListItem>

                <material_1.ListItem>
                  <material_1.ListItemIcon>
                    {verification.verification.checks.signatureValid ? (<icons_material_1.CheckCircleOutlined color="success"/>) : (<icons_material_1.WarningAmberOutlined color="error"/>)}
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Digital Signature" secondary={verification.verification.checks.signatureValid
                    ? 'Signature valid'
                    : 'Signature invalid'}/>
                </material_1.ListItem>

                <material_1.ListItem>
                  <material_1.ListItemIcon>
                    {verification.verification.checks.timestampValid ? (<icons_material_1.CheckCircleOutlined color="success"/>) : (<icons_material_1.WarningAmberOutlined color="error"/>)}
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary="Timestamp" secondary={verification.verification.checks.timestampValid
                    ? 'Within valid range'
                    : 'Timestamp invalid'}/>
                </material_1.ListItem>
              </material_1.List>

              {verification.verification.errors.length > 0 && (<material_1.Alert severity="warning" sx={{ mt: 2 }}>
                  <material_1.Typography variant="body2">
                    <strong>Issues found:</strong>
                  </material_1.Typography>
                  <ul>
                    {verification.verification.errors.map((error, index) => (<li key={index}>
                          <material_1.Typography variant="body2">{error}</material_1.Typography>
                        </li>))}
                  </ul>
                </material_1.Alert>)}
            </material_1.Paper>)}

          <material_1.Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <material_1.Button variant="contained" onClick={handleDownload} startIcon={<icons_material_1.FileDownloadOutlined />}>
              Download Bundle
            </material_1.Button>

            {exportResult.signature && !verification && (<material_1.Button variant="outlined" onClick={() => handleVerify()} startIcon={<icons_material_1.VerifiedUserOutlined />}>
                Verify Signature
              </material_1.Button>)}

            <material_1.Button variant="outlined" onClick={() => window.open(`/api/maestro/v1/evidence/${exportResult.evidenceId}/artifacts`, '_blank')} startIcon={<icons_material_1.ArticleOutlined />}>
              View Artifacts
            </material_1.Button>
          </material_1.Box>
        </>)}
    </material_1.Box>);
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: '60vh' } }}>
      <material_1.DialogTitle>
        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <icons_material_1.FolderZipOutlined />
          <material_1.Typography variant="h6">Export Evidence Bundle</material_1.Typography>
          {runId && <material_1.Chip label={`Run ${runId}`} size="small"/>}
        </material_1.Box>
      </material_1.DialogTitle>

      <material_1.DialogContent>
        <material_1.Stepper activeStep={activeStep} orientation="vertical">
          <material_1.Step>
            <material_1.StepLabel>Configure Export Options</material_1.StepLabel>
            <material_1.StepContent>
              {activeStep === 0 && renderConfigurationStep()}
            </material_1.StepContent>
          </material_1.Step>

          <material_1.Step>
            <material_1.StepLabel>Generate Bundle</material_1.StepLabel>
            <material_1.StepContent>
              {activeStep === 1 && renderGenerationStep()}
            </material_1.StepContent>
          </material_1.Step>

          <material_1.Step>
            <material_1.StepLabel>Verify & Download</material_1.StepLabel>
            <material_1.StepContent>
              {activeStep === 2 && renderVerificationStep()}
            </material_1.StepContent>
          </material_1.Step>
        </material_1.Stepper>
      </material_1.DialogContent>

      {activeStep === 2 && (<material_1.DialogActions>
          <material_1.Button onClick={onClose}>Close</material_1.Button>
          <material_1.Button variant="contained" onClick={() => {
                setActiveStep(0);
                setExportResult(null);
                setVerification(null);
                setError(null);
            }} startIcon={<icons_material_1.FolderZipOutlined />}>
            Export Another
          </material_1.Button>
        </material_1.DialogActions>)}
    </material_1.Dialog>);
};
exports.EvidenceExportDialog = EvidenceExportDialog;
