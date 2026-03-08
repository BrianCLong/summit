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
const Download_1 = __importDefault(require("@mui/icons-material/Download"));
const Refresh_1 = __importDefault(require("@mui/icons-material/Refresh"));
const Info_1 = __importDefault(require("@mui/icons-material/Info"));
const disclosures_1 = require("../services/disclosures");
const artifactOptions = [
    {
        key: 'audit-trail',
        label: 'Audit trail',
        description: 'Immutable, redacted event logs scoped to the selected tenant and timeframe.',
    },
    {
        key: 'sbom',
        label: 'SBOMs',
        description: 'CycloneDX manifests for orchestrated runs and dependencies referenced in the window.',
    },
    {
        key: 'attestations',
        label: 'Attestations',
        description: 'SLSA provenance statements and associated signatures for included artifacts.',
    },
    {
        key: 'policy-reports',
        label: 'Policy reports',
        description: 'OPA decision logs, router verdicts, and compliance checkpoints.',
    },
];
const toLocalInputValue = (date) => {
    const pad = (value) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const fromLocalInputValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date');
    }
    return date.toISOString();
};
const DisclosurePackagerPage = () => {
    const [tenantId, setTenantId] = (0, react_1.useState)('default');
    const [startTime, setStartTime] = (0, react_1.useState)(toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)));
    const [endTime, setEndTime] = (0, react_1.useState)(toLocalInputValue(new Date()));
    const [selectedArtifacts, setSelectedArtifacts] = (0, react_1.useState)(artifactOptions.map((option) => option.key));
    const [callbackUrl, setCallbackUrl] = (0, react_1.useState)('');
    const [jobs, setJobs] = (0, react_1.useState)([]);
    const [activeJob, setActiveJob] = (0, react_1.useState)(null);
    const [runtimeBundle, setRuntimeBundle] = (0, react_1.useState)(null);
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [isRuntimeLoading, setIsRuntimeLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const pollingRef = (0, react_1.useRef)(null);
    const activeJobEta = (0, react_1.useMemo)(() => {
        if (!activeJob?.createdAt)
            return null;
        if (!activeJob.completedAt || activeJob.status === 'running')
            return 'Export is running — target p95 < 2 minutes for 10k events.';
        const started = new Date(activeJob.createdAt).getTime();
        const finished = new Date(activeJob.completedAt).getTime();
        const diffSeconds = Math.max(0, Math.round((finished - started) / 1000));
        return `Completed in ${diffSeconds}s`;
    }, [activeJob]);
    const clearPolling = (0, react_1.useCallback)(() => {
        if (pollingRef.current) {
            window.clearTimeout(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);
    const pollJob = (0, react_1.useCallback)((jobId, tenant) => {
        clearPolling();
        const poll = async () => {
            try {
                const job = await (0, disclosures_1.getDisclosureJob)(tenant, jobId);
                setActiveJob(job);
                setJobs((previous) => {
                    const filtered = previous.filter((item) => item.id !== job.id);
                    return [job, ...filtered];
                });
                if (job.status === 'running' || job.status === 'pending') {
                    pollingRef.current = window.setTimeout(poll, 3000);
                }
                else {
                    pollingRef.current = null;
                }
            }
            catch (pollError) {
                const message = pollError instanceof Error
                    ? pollError.message
                    : 'Unable to poll job status';
                setError(message);
                pollingRef.current = null;
            }
        };
        poll();
    }, [clearPolling]);
    const refreshJobs = (0, react_1.useCallback)(async (tenant) => {
        try {
            const results = await (0, disclosures_1.listDisclosureJobs)(tenant);
            setJobs(results);
            const running = results.find((job) => job.status === 'running' || job.status === 'pending');
            const nextActive = running ?? results[0] ?? null;
            setActiveJob(nextActive);
            if (running) {
                pollJob(running.id, tenant);
            }
            else {
                clearPolling();
            }
        }
        catch (refreshError) {
            const message = refreshError instanceof Error
                ? refreshError.message
                : 'Failed to load disclosure jobs';
            setError(message);
        }
    }, [pollJob, clearPolling]);
    (0, react_1.useEffect)(() => {
        refreshJobs(tenantId);
        (0, disclosures_1.sendDisclosureAnalyticsEvent)('view', tenantId, {
            page: 'disclosure-packager',
        }).catch(() => undefined);
        return () => {
            clearPolling();
        };
    }, [tenantId, refreshJobs, clearPolling]);
    const handleArtifactToggle = (artifact) => {
        setSelectedArtifacts((previous) => {
            if (previous.includes(artifact)) {
                return previous.filter((item) => item !== artifact);
            }
            return [...previous, artifact];
        });
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                tenantId,
                startTime: fromLocalInputValue(startTime),
                endTime: fromLocalInputValue(endTime),
                artifacts: selectedArtifacts,
                callbackUrl: callbackUrl || undefined,
            };
            const job = await (0, disclosures_1.createDisclosureExport)(payload);
            setActiveJob(job);
            setJobs((previous) => [
                job,
                ...previous.filter((item) => item.id !== job.id),
            ]);
            (0, disclosures_1.sendDisclosureAnalyticsEvent)('start', tenantId, {
                artifacts: selectedArtifacts.length,
            }).catch(() => undefined);
            pollJob(job.id, tenantId);
        }
        catch (submitError) {
            const message = submitError instanceof Error
                ? submitError.message
                : 'Failed to submit disclosure export';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRuntimeBundle = async () => {
        setIsRuntimeLoading(true);
        setError(null);
        try {
            const bundle = await (0, disclosures_1.createRuntimeEvidenceBundle)({
                tenantId,
                startTime: fromLocalInputValue(startTime),
                endTime: fromLocalInputValue(endTime),
            });
            setRuntimeBundle(bundle);
        }
        catch (runtimeError) {
            const message = runtimeError instanceof Error
                ? runtimeError.message
                : 'Failed to build runtime tarball';
            setError(message);
        }
        finally {
            setIsRuntimeLoading(false);
        }
    };
    const latestJobs = (0, react_1.useMemo)(() => jobs.slice(0, 5), [jobs]);
    return (<material_1.Box sx={{ px: 4, py: 6 }}>
      <material_1.Stack spacing={4}>
        <material_1.Box>
          <material_1.Typography variant="h4" gutterBottom>
            Disclosure Packager
          </material_1.Typography>
          <material_1.Typography variant="body1" color="text.secondary">
            Export an immutable disclosure bundle for auditors with audit
            events, SBOMs, attestations, and policy evidence. Bundles are
            signed, checksumed, and stored with optional callbacks for
            automation.
          </material_1.Typography>
        </material_1.Box>

        <Grid_1.default container spacing={3} component="form" onSubmit={handleSubmit}>
          <Grid_1.default xs={12} md={7}>
            <material_1.Card variant="outlined">
              <material_1.CardContent>
                <material_1.Stack spacing={3}>
                  <material_1.Box>
                    <material_1.Typography variant="h6" gutterBottom>
                      Timeframe & tenant
                    </material_1.Typography>
                    <Grid_1.default container spacing={2}>
                      <Grid_1.default xs={12} sm={6}>
                        <material_1.TextField label="Start" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} fullWidth required InputLabelProps={{ shrink: true }}/>
                      </Grid_1.default>
                      <Grid_1.default xs={12} sm={6}>
                        <material_1.TextField label="End" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} fullWidth required InputLabelProps={{ shrink: true }}/>
                      </Grid_1.default>
                      <Grid_1.default xs={12} sm={6}>
                        <material_1.TextField label="Tenant ID" value={tenantId} onChange={(event) => setTenantId(event.target.value)} fullWidth required helperText="Tenant isolation enforced on every export request."/>
                      </Grid_1.default>
                      <Grid_1.default xs={12} sm={6}>
                        <material_1.TextField label="Completion webhook (optional)" placeholder="https://example.com/webhooks/disclosures" value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} fullWidth helperText="POSTed when the bundle is signed."/>
                      </Grid_1.default>
                    </Grid_1.default>
                  </material_1.Box>

                  <material_1.Box>
                    <material_1.Typography variant="h6" gutterBottom>
                      Artifacts
                    </material_1.Typography>
                    <material_1.Stack spacing={1}>
                      {artifactOptions.map((option) => (<material_1.FormControlLabel key={option.key} control={<material_1.Checkbox checked={selectedArtifacts.includes(option.key)} onChange={() => handleArtifactToggle(option.key)}/>} label={<material_1.Stack spacing={0.5}>
                              <material_1.Typography variant="subtitle1">
                                {option.label}
                              </material_1.Typography>
                              <material_1.Typography variant="body2" color="text.secondary">
                                {option.description}
                              </material_1.Typography>
                            </material_1.Stack>}/>))}
                    </material_1.Stack>
                  </material_1.Box>

                  <material_1.Stack spacing={1.5}>
                    <material_1.Stack direction="row" spacing={2} alignItems="center">
                      <material_1.Button type="submit" variant="contained" disabled={isSubmitting || selectedArtifacts.length === 0}>
                        Launch export
                      </material_1.Button>
                      <material_1.Button type="button" variant="outlined" startIcon={<Refresh_1.default />} onClick={() => refreshJobs(tenantId)} disabled={isSubmitting}>
                        Refresh status
                      </material_1.Button>
                      <material_1.Button type="button" variant="text" startIcon={<Download_1.default />} onClick={handleRuntimeBundle} disabled={isSubmitting || isRuntimeLoading}>
                        Runtime tarball (optional)
                      </material_1.Button>
                      <material_1.Tooltip title="SLO: p95 export under 2 minutes for 10k events; ≥99% success rate.">
                        <Info_1.default color="action"/>
                      </material_1.Tooltip>
                    </material_1.Stack>
                    {isRuntimeLoading && <material_1.LinearProgress sx={{ maxWidth: 240 }}/>}
                  </material_1.Stack>

                  {error && <material_1.Alert severity="error">{error}</material_1.Alert>}
                  {runtimeBundle && (<material_1.Alert severity="success">
                      Runtime evidence tarball ready. SHA256:{' '}
                      <code>{runtimeBundle.sha256}</code>{' '}
                      {runtimeBundle.downloadUrl && (<material_1.Link href={runtimeBundle.downloadUrl} underline="hover" sx={{ ml: 0.5 }}>
                          Download
                        </material_1.Link>)}
                      <material_1.Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {runtimeBundle.downloadUrl && (<material_1.Button size="small" component={material_1.Link} href={runtimeBundle.downloadUrl} startIcon={<Download_1.default />}>
                            Tarball
                          </material_1.Button>)}
                        {runtimeBundle.manifestUrl && (<material_1.Button size="small" component={material_1.Link} href={runtimeBundle.manifestUrl} startIcon={<Download_1.default />}>
                            Manifest
                          </material_1.Button>)}
                        {runtimeBundle.checksumsUrl && (<material_1.Button size="small" component={material_1.Link} href={runtimeBundle.checksumsUrl} startIcon={<Download_1.default />}>
                            Checksums
                          </material_1.Button>)}
                      </material_1.Stack>
                      <material_1.Typography variant="body2" component="div">
                        Audit events: {runtimeBundle.counts.auditEvents} • Policy
                        decisions: {runtimeBundle.counts.policyDecisions} • SBOM
                        refs: {runtimeBundle.counts.sbomRefs} • Provenance refs:{' '}
                        {runtimeBundle.counts.provenanceRefs}
                      </material_1.Typography>
                      {runtimeBundle.deployedVersion && (<material_1.Typography variant="body2" color="text.secondary">
                          Deployed version: {runtimeBundle.deployedVersion}
                        </material_1.Typography>)}
                    </material_1.Alert>)}
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default xs={12} md={5}>
            <material_1.Stack spacing={3}>
              <material_1.Card variant="outlined">
                <material_1.CardContent>
                  <material_1.Stack spacing={2}>
                    <material_1.Typography variant="h6">Export status</material_1.Typography>
                    {!activeJob && (<material_1.Alert severity="info">
                        No exports in progress. Select a timeframe and tenant,
                        choose artifacts, and launch your first bundle. The
                        packager will stream large exports and surface warnings
                        if any artifact source is missing.
                      </material_1.Alert>)}
                    {activeJob && (<material_1.Stack spacing={1.5}>
                        <material_1.Typography variant="subtitle1">
                          Job {activeJob.id}
                        </material_1.Typography>
                        <material_1.Chip label={activeJob.status.toUpperCase()} color={activeJob.status === 'completed'
                ? 'success'
                : activeJob.status === 'failed'
                    ? 'error'
                    : 'info'} variant="outlined"/>
                        {activeJob.status !== 'completed' &&
                activeJob.status !== 'failed' && <material_1.LinearProgress />}
                        {activeJobEta && (<material_1.Typography variant="body2" color="text.secondary">
                            {activeJobEta}
                          </material_1.Typography>)}
                        {activeJob.status === 'completed' && (<material_1.Stack spacing={1}>
                            <material_1.Alert severity="success">
                              Signed bundle ready. SHA256:{' '}
                              <code>{activeJob.sha256}</code>
                            </material_1.Alert>
                            {activeJob.downloadUrl && (<material_1.Button startIcon={<Download_1.default />} variant="contained" href={activeJob.downloadUrl} sx={{ alignSelf: 'flex-start' }}>
                                Download zip
                              </material_1.Button>)}
                          </material_1.Stack>)}
                        {activeJob.status === 'failed' && (<material_1.Alert severity="error">
                            Export failed{' '}
                            {activeJob.error ? `— ${activeJob.error}` : ''}.
                            Retry or check webhook logs.
                          </material_1.Alert>)}
                        {activeJob.warnings.length > 0 && (<material_1.Stack spacing={1}>
                            <material_1.Typography variant="subtitle2">
                              Warnings
                            </material_1.Typography>
                            <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                              {activeJob.warnings.map((warning) => (<material_1.Chip key={warning} label={warning} color="warning" variant="outlined" size="small"/>))}
                            </material_1.Stack>
                          </material_1.Stack>)}
                        {Object.keys(activeJob.artifactStats).length > 0 && (<material_1.Stack spacing={0.5}>
                            <material_1.Typography variant="subtitle2">
                              Artifacts included
                            </material_1.Typography>
                            {Object.entries(activeJob.artifactStats).map(([artifact, count]) => (<material_1.Typography variant="body2" key={artifact}>
                                  • {artifact}: {count.toLocaleString()} records
                                </material_1.Typography>))}
                          </material_1.Stack>)}
                      </material_1.Stack>)}
                  </material_1.Stack>
                </material_1.CardContent>
              </material_1.Card>

              <material_1.Card variant="outlined">
                <material_1.CardContent>
                  <material_1.Stack spacing={1.5}>
                    <material_1.Typography variant="h6">Export history</material_1.Typography>
                    {latestJobs.length === 0 && (<material_1.Typography variant="body2" color="text.secondary">
                        Exports appear here once they complete. Use this area to
                        confirm checksum values and runbook callbacks.
                      </material_1.Typography>)}
                    {latestJobs.map((job) => (<material_1.Box key={job.id} sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
            }}>
                        <material_1.Stack spacing={1}>
                          <material_1.Stack direction="row" spacing={1} alignItems="center">
                            <material_1.Chip label={job.status.toUpperCase()} size="small" color={job.status === 'completed'
                ? 'success'
                : job.status === 'failed'
                    ? 'error'
                    : 'info'}/>
                            <material_1.Typography variant="subtitle2">
                              {new Date(job.createdAt).toLocaleString()}
                            </material_1.Typography>
                          </material_1.Stack>
                          <material_1.Typography variant="body2" color="text.secondary">
                            Artifacts:{' '}
                            {Object.keys(job.artifactStats).length || 0} •
                            Warnings: {job.warnings.length}
                          </material_1.Typography>
                          {job.downloadUrl && job.status === 'completed' && (<material_1.Link href={job.downloadUrl} underline="hover">
                              Download
                            </material_1.Link>)}
                        </material_1.Stack>
                      </material_1.Box>))}
                  </material_1.Stack>
                </material_1.CardContent>
              </material_1.Card>

              <material_1.Card variant="outlined">
                <material_1.CardContent>
                  <material_1.Stack spacing={1}>
                    <material_1.Typography variant="h6">Empty-state guide</material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      1. Confirm your tenant slug and timeframe (≤31 days).
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      2. Pick the required artifacts — audit events, SBOM,
                      attestations, and policy evidence are selected by default.
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      3. Optional: register a webhook for downstream regulators
                      or trust portals.
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      4. Launch the export and monitor the SLO indicator.
                      Completed bundles expose download links and SHA256
                      checksums.
                    </material_1.Typography>
                  </material_1.Stack>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Stack>
          </Grid_1.default>
        </Grid_1.default>

        <material_1.Divider />

        <material_1.Card variant="outlined">
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Compliance runbook quick-links
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Signed disclosure bundles satisfy SOC2/ISO export requirements.
              Verify the checksum and signature before providing to regulators.
              Use the webhook to notify your trust center or evidence locker
              automatically.
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>
    </material_1.Box>);
};
exports.default = DisclosurePackagerPage;
