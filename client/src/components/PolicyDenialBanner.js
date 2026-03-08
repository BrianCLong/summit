"use strict";
/**
 * Policy Denial Banner Component - GA Core Implementation
 * Displays policy denial with structured appeal path and reasons
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
const client_1 = require("@apollo/client");
const appeals_1 = require("../graphql/appeals");
const getRiskLevelColor = (level) => {
    switch (level) {
        case 'HIGH':
            return 'error';
        case 'MEDIUM':
            return 'warning';
        case 'LOW':
            return 'info';
        default:
            return 'default';
    }
};
const getUrgencyColor = (urgency) => {
    switch (urgency) {
        case 'CRITICAL':
            return 'error';
        case 'HIGH':
            return 'warning';
        case 'MEDIUM':
            return 'info';
        case 'LOW':
            return 'success';
        default:
            return 'default';
    }
};
const formatSlaTime = (hours) => {
    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0
        ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
        : ''}`;
};
const PolicyDenialBanner = ({ decision, onRetry, onDismiss, className, }) => {
    const [showAppealForm, setShowAppealForm] = (0, react_1.useState)(false);
    const [appealSubmitted, setAppealSubmitted] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Appeal form state
    const [justification, setJustification] = (0, react_1.useState)('');
    const [businessNeed, setBusinessNeed] = (0, react_1.useState)('');
    const [urgency, setUrgency] = (0, react_1.useState)('MEDIUM');
    const [requestedDuration, setRequestedDuration] = (0, react_1.useState)('24 hours');
    const [submitAppeal] = (0, client_1.useMutation)(appeals_1.SUBMIT_POLICY_APPEAL);
    // Check if there's an existing appeal
    const { data: appealStatus } = (0, client_1.useQuery)(appeals_1.GET_APPEAL_STATUS, {
        variables: { decisionId: decision.decisionId },
        skip: !appealSubmitted,
        pollInterval: appealSubmitted ? 30000 : 0,
    });
    const handleSubmitAppeal = async () => {
        try {
            setError(null);
            const result = await submitAppeal({
                variables: {
                    decisionId: decision.decisionId,
                    justification,
                    businessNeed,
                    urgency,
                    requestedDuration,
                },
            });
            if (result.data?.submitPolicyAppeal) {
                setAppealSubmitted(true);
                setShowAppealForm(false);
            }
        }
        catch (err) {
            setError(err instanceof Error
                ? err.message
                : 'Failed to submit appeal. Please try again.');
        }
    };
    if (appealStatus?.getAppealStatus?.status === 'APPROVED') {
        return (<material_1.Alert severity="success" icon={<icons_material_1.Shield fontSize="small"/>} className={`policy-denial-banner ${className || ''}`} action={onRetry ? (<material_1.Button color="success" size="small" onClick={onRetry}>
              Retry Action
            </material_1.Button>) : undefined}>
        <material_1.AlertTitle>Appeal Approved</material_1.AlertTitle>
        <material_1.Typography variant="body2">
          Your access request has been approved by a Data Steward. You may now
          retry your action.
        </material_1.Typography>
        {appealStatus.getAppealStatus.responseReason && (<material_1.Typography variant="caption" color="text.secondary">
            Reason: {appealStatus.getAppealStatus.responseReason}
          </material_1.Typography>)}
      </material_1.Alert>);
    }
    return (<>
      <material_1.Alert severity="error" icon={<icons_material_1.WarningAmber fontSize="small"/>} className={`policy-denial-banner ${className || ''}`} onClose={onDismiss}>
        <material_1.AlertTitle>Access Denied</material_1.AlertTitle>
        <material_1.Stack spacing={1.5}>
          <material_1.Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {decision.metadata?.riskLevel && (<material_1.Chip label={`${decision.metadata.riskLevel} Risk`} color={getRiskLevelColor(decision.metadata.riskLevel)} size="small"/>)}
            <material_1.Typography variant="caption" color="text.secondary">
              Policy: {decision.policy}
            </material_1.Typography>
          </material_1.Stack>

          <material_1.Typography variant="body2">{decision.reason}</material_1.Typography>

          {decision.metadata?.alternatives &&
            decision.metadata.alternatives.length > 0 && (<material_1.Box>
                <material_1.Typography variant="caption" color="text.secondary">
                  Suggested alternatives:
                </material_1.Typography>
                <material_1.Box component="ul" sx={{ mb: 0, mt: 0.5, pl: 2 }}>
                  {decision.metadata.alternatives.map((alt, index) => (<li key={index}>
                      <material_1.Typography variant="body2">{alt}</material_1.Typography>
                    </li>))}
                </material_1.Box>
              </material_1.Box>)}

          {decision.appeal?.available ? (<material_1.Card variant="outlined" sx={{ borderColor: 'info.light', bgcolor: 'info.50' }}>
              <material_1.CardContent sx={{ py: 1.5 }}>
                <material_1.Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <material_1.Stack direction="row" spacing={1} alignItems="center">
                    <icons_material_1.InfoOutlined color="info" fontSize="small"/>
                    <material_1.Box>
                      <material_1.Typography variant="subtitle2" color="info.main">
                        Appeal Available
                      </material_1.Typography>
                      <material_1.Typography variant="caption" color="text.secondary">
                        Response SLA: {formatSlaTime(decision.appeal.slaHours)}
                        {decision.appeal.requiredRole && (<span> • Reviewer: {decision.appeal.requiredRole}</span>)}
                      </material_1.Typography>
                    </material_1.Box>
                  </material_1.Stack>

                  {appealSubmitted ? (<material_1.Stack spacing={0.5} alignItems="flex-end">
                      {appealStatus?.getAppealStatus ? (<>
                          <material_1.Chip label={appealStatus.getAppealStatus.status} color={getUrgencyColor(appealStatus.getAppealStatus.urgency)} size="small"/>
                          <material_1.Typography variant="caption" color="text.secondary">
                            <icons_material_1.AccessTime fontSize="inherit"/> Submitted{' '}
                            {new Date(appealStatus.getAppealStatus.createdAt).toLocaleString()}
                          </material_1.Typography>
                        </>) : (<material_1.Chip label="Appeal Submitted" color="info" size="small"/>)}
                    </material_1.Stack>) : (<material_1.Button variant="contained" size="small" onClick={() => setShowAppealForm(true)} startIcon={<icons_material_1.Description fontSize="small"/>}>
                      Submit Appeal
                    </material_1.Button>)}
                </material_1.Stack>

                {decision.appeal.instructions && (<material_1.Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Appeal instructions: {decision.appeal.instructions}
                  </material_1.Typography>)}
              </material_1.CardContent>
            </material_1.Card>) : (decision.appeal && (<material_1.Typography variant="caption" color="text.secondary">
                <icons_material_1.InfoOutlined fontSize="inherit"/>{' '}
                {decision.appeal.instructions ||
                'This policy decision cannot be appealed.'}
              </material_1.Typography>))}

          <material_1.Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <details>
              <summary style={{ cursor: 'pointer' }}>
                <material_1.Typography variant="caption" color="text.secondary">
                  Technical Details
                </material_1.Typography>
              </summary>
              <material_1.Box sx={{ mt: 1 }}>
                <material_1.Typography variant="caption" color="text.secondary">
                  Decision ID: <code>{decision.decisionId}</code>
                </material_1.Typography>
                <material_1.Typography variant="caption" color="text.secondary">
                  Timestamp: {new Date(decision.timestamp).toLocaleString()}
                </material_1.Typography>
                <material_1.Typography variant="caption" color="text.secondary">
                  Policy: <code>{decision.policy}</code>
                </material_1.Typography>
                {decision.appeal?.appealId && (<material_1.Typography variant="caption" color="text.secondary">
                    Appeal ID: <code>{decision.appeal.appealId}</code>
                  </material_1.Typography>)}
              </material_1.Box>
            </details>
          </material_1.Box>
        </material_1.Stack>
      </material_1.Alert>

      <material_1.Dialog open={showAppealForm} onClose={() => setShowAppealForm(false)} fullWidth maxWidth="md">
        <material_1.DialogTitle>Submit Policy Appeal</material_1.DialogTitle>
        <material_1.DialogContent dividers>
          {error && (<material_1.Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </material_1.Alert>)}

          <material_1.Alert severity="info" sx={{ mb: 2 }} icon={<icons_material_1.InfoOutlined />}>
            <material_1.Typography variant="body2">
              <strong>Response SLA:</strong>{' '}
              {decision.appeal && formatSlaTime(decision.appeal.slaHours)}
              <br />
              <strong>Reviewer:</strong>{' '}
              {decision.appeal?.requiredRole || 'Data Steward'}
            </material_1.Typography>
          </material_1.Alert>

          <material_1.Stack spacing={2}>
            <material_1.TextField label="Business Justification" multiline minRows={3} placeholder="Explain why this access is needed for business purposes..." value={businessNeed} onChange={(e) => setBusinessNeed(e.target.value)} required helperText="Describe the specific business requirement that necessitates this access."/>

            <material_1.TextField label="Technical Justification" multiline minRows={3} placeholder="Provide technical details about the access needed..." value={justification} onChange={(e) => setJustification(e.target.value)} required helperText={decision.appeal?.instructions}/>

            <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Urgency Level</material_1.InputLabel>
                <material_1.Select label="Urgency Level" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <material_1.MenuItem value="LOW">Low - Routine work</material_1.MenuItem>
                  <material_1.MenuItem value="MEDIUM">Medium - Standard business need</material_1.MenuItem>
                  <material_1.MenuItem value="HIGH">High - Time-sensitive requirement</material_1.MenuItem>
                  <material_1.MenuItem value="CRITICAL">
                    Critical - Security incident or emergency
                  </material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>

              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Requested Duration</material_1.InputLabel>
                <material_1.Select label="Requested Duration" value={requestedDuration} onChange={(e) => setRequestedDuration(e.target.value)}>
                  <material_1.MenuItem value="4 hours">4 hours</material_1.MenuItem>
                  <material_1.MenuItem value="12 hours">12 hours</material_1.MenuItem>
                  <material_1.MenuItem value="24 hours">24 hours (default)</material_1.MenuItem>
                  <material_1.MenuItem value="3 days">3 days</material_1.MenuItem>
                  <material_1.MenuItem value="1 week">1 week</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </material_1.Stack>

            <material_1.Alert severity="warning" icon={<icons_material_1.WarningAmber fontSize="small"/>}>
              <material_1.Typography variant="body2">
                <strong>Note:</strong> All appeals are logged and audited. Misuse
                of the appeal process may result in access restrictions.
              </material_1.Typography>
            </material_1.Alert>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setShowAppealForm(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={handleSubmitAppeal} disabled={!businessNeed.trim() || !justification.trim()}>
            Submit Appeal
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </>);
};
exports.default = PolicyDenialBanner;
