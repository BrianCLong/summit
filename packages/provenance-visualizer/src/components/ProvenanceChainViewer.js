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
exports.ProvenanceChainViewer = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const date_fns_1 = require("date-fns");
const ProvenanceChainViewer = ({ claimId, client, onVerify, }) => {
    const [chain, setChain] = (0, react_1.useState)([]);
    const [claim, setClaim] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [verified, setVerified] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadProvenanceChain();
    }, [claimId]);
    const loadProvenanceChain = async () => {
        try {
            setLoading(true);
            setError(null);
            const [chainData, claimData] = await Promise.all([
                client.getProvenanceChain(claimId),
                client.getClaim(claimId),
            ]);
            setChain(chainData);
            setClaim(claimData);
            // Verify hash
            const verification = await client.verifyHash(claimData.content, claimData.hash);
            setVerified(verification.valid);
            onVerify?.(verification.valid);
        }
        catch (err) {
            setError(err.message || 'Failed to load provenance chain');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error) {
        return <material_1.Alert severity="error">{error}</material_1.Alert>;
    }
    if (!claim) {
        return <material_1.Alert severity="warning">Claim not found</material_1.Alert>;
    }
    return (<material_1.Box>
      {/* Claim Header */}
      <material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <material_1.Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <icons_material_1.AccountTree />
              Provenance Chain
            </material_1.Typography>
            {verified !== null && (<material_1.Chip icon={verified ? <icons_material_1.Verified /> : <icons_material_1.Warning />} label={verified ? 'Verified' : 'Integrity Issue'} color={verified ? 'success' : 'error'} size="small"/>)}
          </material_1.Box>

          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Claim ID: {claim.id}
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Hash: <code>{claim.hash}</code>
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary" gutterBottom>
            Created: {(0, date_fns_1.format)(new Date(claim.created_at), 'PPpp')}
          </material_1.Typography>

          {claim.policyLabels.length > 0 && (<material_1.Box mt={2}>
              {claim.policyLabels.map((label) => (<material_1.Chip key={label} label={label} size="small" sx={{ mr: 0.5 }}/>))}
            </material_1.Box>)}
        </material_1.CardContent>
      </material_1.Card>

      {/* Provenance Chain Steps */}
      {chain.length > 0 ? (<material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Transformation History
            </material_1.Typography>
            <material_1.Stepper orientation="vertical">
              {chain.map((entry, index) => (<material_1.Step key={entry.id} active completed>
                  <material_1.StepLabel>
                    <material_1.Typography variant="subtitle2">
                      Provenance Entry {index + 1}
                    </material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      {(0, date_fns_1.format)(new Date(entry.created_at), 'PPpp')}
                    </material_1.Typography>
                  </material_1.StepLabel>
                  <material_1.StepContent>
                    <material_1.Box ml={2}>
                      {/* Transforms */}
                      {entry.transforms.length > 0 && (<material_1.Box mb={1}>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Transforms:
                          </material_1.Typography>
                          {entry.transforms.map((transform, i) => (<material_1.Chip key={i} label={transform} size="small" variant="outlined" sx={{ ml: 0.5 }}/>))}
                        </material_1.Box>)}

                      {/* Sources */}
                      {entry.sources.length > 0 && (<material_1.Box mb={1}>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Sources:
                          </material_1.Typography>
                          {entry.sources.map((source, i) => (<material_1.Typography key={i} variant="body2" component="div">
                              • {source}
                            </material_1.Typography>))}
                        </material_1.Box>)}

                      {/* Lineage */}
                      {Object.keys(entry.lineage).length > 0 && (<material_1.Box>
                          <material_1.Typography variant="caption" color="text.secondary">
                            Lineage:
                          </material_1.Typography>
                          <material_1.Box component="pre" sx={{
                        fontSize: '0.75rem',
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 200,
                    }}>
                            {JSON.stringify(entry.lineage, null, 2)}
                          </material_1.Box>
                        </material_1.Box>)}
                    </material_1.Box>
                  </material_1.StepContent>
                </material_1.Step>))}
            </material_1.Stepper>
          </material_1.CardContent>
        </material_1.Card>) : (<material_1.Alert severity="info">No provenance chain entries found for this claim.</material_1.Alert>)}
    </material_1.Box>);
};
exports.ProvenanceChainViewer = ProvenanceChainViewer;
