"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseExportModal = CaseExportModal;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const Dialog_1 = require("@/components/ui/Dialog");
const Button_1 = require("@/components/ui/Button");
const progress_1 = require("@/components/ui/progress");
const Alert_1 = require("@/components/ui/Alert");
const Badge_1 = require("@/components/ui/Badge");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const switch_1 = require("@/components/ui/switch");
const useCaseExportJob_1 = require("@/hooks/useCaseExportJob");
const flags_1 = require("@/lib/flags");
const defaultOptions = {
    includeTimeline: true,
    includeGraphSnapshot: true,
    includeSources: true,
};
function CaseExportModal({ tenantId, caseId, caseTitle, open, onOpenChange }) {
    const [format, setFormat] = (0, react_1.useState)('pdf');
    const [options, setOptions] = (0, react_1.useState)(defaultOptions);
    const featureEnabled = (0, flags_1.isCaseExportRevampEnabled)();
    const exportJob = (0, useCaseExportJob_1.useCaseExportJob)({
        tenantId,
        caseId,
        caseTitle,
        format,
        options,
        mode: featureEnabled ? 'durable' : 'legacy',
    });
    const idempotencyKey = (0, react_1.useMemo)(() => exportJob.job?.idempotencyKey ?? exportJob.idempotencyKey, [exportJob.idempotencyKey, exportJob.job?.idempotencyKey]);
    const canStart = (0, react_1.useMemo)(() => {
        return !exportJob.job || ['failed', 'complete', 'canceled'].includes(exportJob.job.status);
    }, [exportJob.job]);
    const isStarting = exportJob.job?.status === 'creating';
    const toggleOption = (key) => {
        setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    };
    const renderStatus = () => {
        if (!exportJob.job) {
            // PROMPT-UPDATE: Show policy check readiness
            return (<div className="space-y-2">
           <p className="text-sm text-muted-foreground">Select options and start an export.</p>
           <div className="flex items-center gap-2 text-xs text-green-600">
               <span className="h-2 w-2 rounded-full bg-green-500"/>
               Policy Check: Ready
           </div>
        </div>);
        }
        const { status, progress = 0, jobId, downloadUrl, error } = exportJob.job;
        // PROMPT-UPDATE: Show policy blocked state
        if (error && error.includes('POLICY_BLOCKED')) {
            return (<Alert_1.Alert variant="destructive" role="alert" aria-live="assertive">
          <Alert_1.AlertTitle>Policy Check Failed</Alert_1.AlertTitle>
          <Alert_1.AlertDescription className="space-y-2">
            <p className="font-semibold">{error}</p>
            <p className="text-sm">Your export was blocked by the Licensing & Authority Compiler.</p>
            <div className="rounded bg-destructive/10 p-2 text-xs">
                <strong>Remediation:</strong> Check license constraints or purpose binding.
            </div>
          </Alert_1.AlertDescription>
        </Alert_1.Alert>);
        }
        if (status === 'failed') {
            return (<Alert_1.Alert variant="destructive" role="alert" aria-live="assertive">
          <Alert_1.AlertTitle>Export failed</Alert_1.AlertTitle>
          <Alert_1.AlertDescription className="space-y-2">
            <p>{error || 'The export could not be completed.'}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">Job ID:</span>
              <input_1.Input readOnly value={jobId} aria-label="Export job id" onFocus={(e) => e.target.select()}/>
              <Button_1.Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(jobId)}>
                Copy job id
              </Button_1.Button>
            </div>
          </Alert_1.AlertDescription>
        </Alert_1.Alert>);
        }
        if (status === 'ready' && downloadUrl) {
            return (<Alert_1.Alert className="space-y-2" role="status" aria-live="polite">
          <Alert_1.AlertTitle>Download ready</Alert_1.AlertTitle>
          <Alert_1.AlertDescription>
            <div className="flex items-center gap-2">
              <Badge_1.Badge variant="secondary">Job {jobId}</Badge_1.Badge>
              <span className="text-sm text-muted-foreground">Click to download (required for Safari).</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button_1.Button onClick={exportJob.markDownload} size="sm" aria-label="Download export">
                    <lucide_react_1.Download className="h-4 w-4 mr-2"/> Download Bundle
                  </Button_1.Button>
                   <Button_1.Button variant="outline" size="sm" onClick={() => window.open(downloadUrl + '?manifest=true', '_blank')} aria-label="View Manifest" title="Verify Provenance Manifest">
                    <lucide_react_1.FileText className="h-4 w-4 mr-2"/> View Manifest
                  </Button_1.Button>
                </div>
                <div className="text-xs text-muted-foreground">
                    Includes <strong>Provenance Manifest</strong> with Policy Proof.
                </div>
            </div>
          </Alert_1.AlertDescription>
        </Alert_1.Alert>);
        }
        return (<div className="space-y-2" role="status" aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium capitalize">{status?.replace('_', ' ') || 'initializing'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <progress_1.Progress value={progress} max={100}/>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge_1.Badge variant="outline">Job {jobId || 'pending'}</Badge_1.Badge>
          <span>Idempotency: {idempotencyKey}</span>
        </div>
      </div>);
    };
    return (<Dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog_1.DialogContent aria-label="Case export modal">
        <Dialog_1.DialogHeader>
          <Dialog_1.DialogTitle>Export case</Dialog_1.DialogTitle>
          <Dialog_1.DialogDescription>
            Generate a signed {format.toUpperCase()} package that includes timeline, graph snapshot, and sources. Safe to close or
            navigate away—progress is retained.
          </Dialog_1.DialogDescription>
        </Dialog_1.DialogHeader>

        {!featureEnabled && (<Alert_1.Alert variant="warning" role="alert" aria-live="polite">
            <Alert_1.AlertTitle>Rollback mode active</Alert_1.AlertTitle>
            <Alert_1.AlertDescription>
              Running legacy export flow for safety. Progress will not persist across refreshes.
            </Alert_1.AlertDescription>
          </Alert_1.Alert>)}

        {exportJob.error && (<Alert_1.Alert variant="destructive" role="alert" aria-live="assertive">
            <Alert_1.AlertTitle>Export error</Alert_1.AlertTitle>
            <Alert_1.AlertDescription>{exportJob.error}</Alert_1.AlertDescription>
          </Alert_1.Alert>)}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4" role="group" aria-label="Export format">
            <Button_1.Button variant={format === 'pdf' ? 'default' : 'outline'} onClick={() => setFormat('pdf')} aria-pressed={format === 'pdf'}>
              <lucide_react_1.FileText className="h-4 w-4 mr-2"/> PDF report
            </Button_1.Button>
            <Button_1.Button variant={format === 'zip' ? 'default' : 'outline'} onClick={() => setFormat('zip')} aria-pressed={format === 'zip'}>
              <lucide_react_1.FileArchive className="h-4 w-4 mr-2"/> ZIP bundle
            </Button_1.Button>
          </div>

          <div className="space-y-2" role="group" aria-label="Export options">
            <label_1.Label className="text-sm font-semibold">Include</label_1.Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <switch_1.Switch checked={options.includeTimeline} onCheckedChange={() => toggleOption('includeTimeline')} aria-label="Include timeline"/>
                Timeline
              </label>
              <label className="flex items-center gap-2 text-sm">
                <switch_1.Switch checked={options.includeGraphSnapshot} onCheckedChange={() => toggleOption('includeGraphSnapshot')} aria-label="Include graph snapshot"/>
                Graph snapshot
              </label>
              <label className="flex items-center gap-2 text-sm">
                <switch_1.Switch checked={options.includeSources} onCheckedChange={() => toggleOption('includeSources')} aria-label="Include sources"/>
                Sources & provenance
              </label>
            </div>
          </div>

          {renderStatus()}
        </div>

        <Dialog_1.DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <lucide_react_1.Link className="h-4 w-4"/> Resumes automatically when you return.
          </div>
          <div className="flex gap-2">
            <Button_1.Button variant="outline" onClick={exportJob.cancel} aria-label="Cancel export">
              Cancel
            </Button_1.Button>
            <Button_1.Button variant="secondary" onClick={exportJob.startNewExport} disabled={isStarting} aria-label="Start a new export job">
              Start new export
            </Button_1.Button>
            <Button_1.Button onClick={exportJob.startExport} disabled={!canStart || isStarting} aria-label="Start export">
              {isStarting ? 'Starting…' : 'Start export'}
            </Button_1.Button>
          </div>
        </Dialog_1.DialogFooter>
      </Dialog_1.DialogContent>
    </Dialog_1.Dialog>);
}
