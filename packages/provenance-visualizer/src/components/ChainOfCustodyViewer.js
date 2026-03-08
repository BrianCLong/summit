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
exports.ChainOfCustodyViewer = void 0;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const lab_1 = require("@mui/lab");
const icons_material_1 = require("@mui/icons-material");
const date_fns_1 = require("date-fns");
const ChainOfCustodyViewer = ({ evidenceId, client, }) => {
    const [evidence, setEvidence] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadEvidence();
    }, [evidenceId]);
    const loadEvidence = async () => {
        try {
            setLoading(true);
            setError(null);
            const evidenceData = await client.getEvidence(evidenceId);
            setEvidence(evidenceData);
        }
        catch (err) {
            setError(err.message || 'Failed to load evidence');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (<material_1.Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    if (error) {
        return <material_1.Alert severity="error">{error}</material_1.Alert>;
    }
    if (!evidence) {
        return <material_1.Alert severity="warning">Evidence not found</material_1.Alert>;
    }
    const getTransformIcon = (transformType) => {
        if (transformType.toLowerCase().includes('encrypt'))
            return <icons_material_1.LockOutlined />;
        if (transformType.toLowerCase().includes('sign'))
            return <icons_material_1.VerifiedUser />;
        if (transformType.toLowerCase().includes('hash'))
            return <icons_material_1.FingerprintOutlined />;
        return <icons_material_1.PersonOutline />;
    };
    return (<material_1.Box>
      {/* Evidence Header */}
      <material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Chain of Custody
          </material_1.Typography>

          <material_1.Box mb={2}>
            <material_1.Typography variant="body2" color="text.secondary">
              Evidence ID: {evidence.id}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Source: {evidence.sourceRef}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Checksum ({evidence.checksumAlgorithm}): <code>{evidence.checksum}</code>
            </material_1.Typography>
            {evidence.fileSize && (<material_1.Typography variant="body2" color="text.secondary">
                Size: {(evidence.fileSize / 1024).toFixed(2)} KB
              </material_1.Typography>)}
            <material_1.Typography variant="body2" color="text.secondary">
              Registered: {(0, date_fns_1.format)(new Date(evidence.created_at), 'PPpp')}
            </material_1.Typography>
            {evidence.authorityId && (<material_1.Typography variant="body2" color="text.secondary">
                Authority: {evidence.authorityId}
              </material_1.Typography>)}
          </material_1.Box>

          {/* Policy Labels */}
          {evidence.policyLabels.length > 0 && (<material_1.Box>
              <material_1.Typography variant="caption" color="text.secondary">
                Policy Labels:
              </material_1.Typography>
              <material_1.Box mt={0.5}>
                {evidence.policyLabels.map((label) => (<material_1.Chip key={label} label={label} size="small" color="primary" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }}/>))}
              </material_1.Box>
            </material_1.Box>)}
        </material_1.CardContent>
      </material_1.Card>

      {/* Transformation Chain */}
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Transformation History
          </material_1.Typography>

          {evidence.transformChain.length > 0 ? (<lab_1.Timeline position="alternate">
              {/* Initial State */}
              <lab_1.TimelineItem>
                <lab_1.TimelineOppositeContent color="text.secondary">
                  {(0, date_fns_1.format)(new Date(evidence.created_at), 'PPpp')}
                </lab_1.TimelineOppositeContent>
                <lab_1.TimelineSeparator>
                  <lab_1.TimelineDot color="primary">
                    <icons_material_1.FingerprintOutlined />
                  </lab_1.TimelineDot>
                  <lab_1.TimelineConnector />
                </lab_1.TimelineSeparator>
                <lab_1.TimelineContent>
                  <material_1.Card variant="outlined">
                    <material_1.CardContent>
                      <material_1.Typography variant="subtitle2">Evidence Registered</material_1.Typography>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Initial checksum: {evidence.checksum.slice(0, 16)}...
                      </material_1.Typography>
                      {evidence.authorityId && (<material_1.Typography variant="caption" color="text.secondary" display="block">
                          By: {evidence.authorityId}
                        </material_1.Typography>)}
                    </material_1.CardContent>
                  </material_1.Card>
                </lab_1.TimelineContent>
              </lab_1.TimelineItem>

              {/* Transformations */}
              {evidence.transformChain.map((transform, index) => (<lab_1.TimelineItem key={index}>
                  <lab_1.TimelineOppositeContent color="text.secondary">
                    {(0, date_fns_1.format)(new Date(transform.timestamp), 'PPpp')}
                  </lab_1.TimelineOppositeContent>
                  <lab_1.TimelineSeparator>
                    <lab_1.TimelineDot color="secondary">
                      {getTransformIcon(transform.transformType)}
                    </lab_1.TimelineDot>
                    {index < evidence.transformChain.length - 1 && <lab_1.TimelineConnector />}
                  </lab_1.TimelineSeparator>
                  <lab_1.TimelineContent>
                    <material_1.Card variant="outlined">
                      <material_1.CardContent>
                        <material_1.Typography variant="subtitle2">{transform.transformType}</material_1.Typography>
                        <material_1.Typography variant="caption" color="text.secondary" display="block">
                          Actor: {transform.actorId}
                        </material_1.Typography>
                        {transform.config && Object.keys(transform.config).length > 0 && (<material_1.Box component="pre" sx={{
                        mt: 1,
                        fontSize: '0.7rem',
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 100,
                    }}>
                            {JSON.stringify(transform.config, null, 2)}
                          </material_1.Box>)}
                      </material_1.CardContent>
                    </material_1.Card>
                  </lab_1.TimelineContent>
                </lab_1.TimelineItem>))}
            </lab_1.Timeline>) : (<material_1.Alert severity="info">No transformations recorded for this evidence.</material_1.Alert>)}

          {/* Metadata */}
          {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (<material_1.Box mt={3}>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Additional Metadata
              </material_1.Typography>
              <material_1.Box component="pre" sx={{
                fontSize: '0.75rem',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 200,
            }}>
                {JSON.stringify(evidence.metadata, null, 2)}
              </material_1.Box>
            </material_1.Box>)}
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
};
exports.ChainOfCustodyViewer = ChainOfCustodyViewer;
