import { useMemo, useState } from 'react'
import { Download, FileText, FileArchive, Link as LinkIcon, RefreshCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { useCaseExportJob } from '@/hooks/useCaseExportJob'
import { isCaseExportRevampEnabled } from '@/lib/flags'
import type { ExportFormat, ExportOptions } from '@/types/export'

interface CaseExportModalProps {
  tenantId: string
  caseId: string
  caseTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultOptions: ExportOptions = {
  includeTimeline: true,
  includeGraphSnapshot: true,
  includeSources: true,
}

export function CaseExportModal({ tenantId, caseId, caseTitle, open, onOpenChange }: CaseExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [options, setOptions] = useState<ExportOptions>(defaultOptions)
  const featureEnabled = isCaseExportRevampEnabled()
  const exportJob = useCaseExportJob({
    tenantId,
    caseId,
    caseTitle,
    format,
    options,
    mode: featureEnabled ? 'durable' : 'legacy',
  })

  const idempotencyKey = useMemo(
    () => exportJob.job?.idempotencyKey ?? exportJob.idempotencyKey,
    [exportJob.idempotencyKey, exportJob.job?.idempotencyKey]
  )

  const canStart = useMemo(() => {
    return !exportJob.job || ['failed', 'complete', 'canceled'].includes(exportJob.job.status)
  }, [exportJob.job])

  const isStarting = exportJob.job?.status === 'creating'

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderStatus = () => {
    if (!exportJob.job) {
      // PROMPT-UPDATE: Show policy check readiness
      return (
        <div className="space-y-2">
           <p className="text-sm text-muted-foreground">Select options and start an export.</p>
           <div className="flex items-center gap-2 text-xs text-green-600">
               <span className="h-2 w-2 rounded-full bg-green-500" />
               Policy Check: Ready
           </div>
        </div>
      );
    }

    const { status, progress = 0, jobId, downloadUrl, error } = exportJob.job

    // PROMPT-UPDATE: Show policy blocked state
    if (error && error.includes('POLICY_BLOCKED')) {
       return (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>Policy Check Failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="font-semibold">{error}</p>
            <p className="text-sm">Your export was blocked by the Licensing & Authority Compiler.</p>
            <div className="rounded bg-destructive/10 p-2 text-xs">
                <strong>Remediation:</strong> Check license constraints or purpose binding.
            </div>
          </AlertDescription>
        </Alert>
       )
    }

    if (status === 'failed') {
      return (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>Export failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error || 'The export could not be completed.'}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">Job ID:</span>
              <Input
                readOnly
                value={jobId}
                aria-label="Export job id"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(jobId)}
              >
                Copy job id
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    if (status === 'ready' && downloadUrl) {
      return (
        <Alert className="space-y-2" role="status" aria-live="polite">
          <AlertTitle>Download ready</AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Job {jobId}</Badge>
              <span className="text-sm text-muted-foreground">Click to download (required for Safari).</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button onClick={exportJob.markDownload} size="sm" aria-label="Download export">
                    <Download className="h-4 w-4 mr-2" /> Download Bundle
                  </Button>
                   <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(downloadUrl + '?manifest=true', '_blank')}
                    aria-label="View Manifest"
                    title="Verify Provenance Manifest"
                  >
                    <FileText className="h-4 w-4 mr-2" /> View Manifest
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                    Includes <strong>Provenance Manifest</strong> with Policy Proof.
                </div>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-2" role="status" aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium capitalize">{status?.replace('_', ' ') || 'initializing'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} max={100} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Job {jobId || 'pending'}</Badge>
          <span>Idempotency: {idempotencyKey}</span>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Case export modal">
        <DialogHeader>
          <DialogTitle>Export case</DialogTitle>
          <DialogDescription>
            Generate a signed {format.toUpperCase()} package that includes timeline, graph snapshot, and sources. Safe to close or
            navigate away—progress is retained.
          </DialogDescription>
        </DialogHeader>

        {!featureEnabled && (
          <Alert variant="warning" role="alert" aria-live="polite">
            <AlertTitle>Rollback mode active</AlertTitle>
            <AlertDescription>
              Running legacy export flow for safety. Progress will not persist across refreshes.
            </AlertDescription>
          </Alert>
        )}

        {exportJob.error && (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertTitle>Export error</AlertTitle>
            <AlertDescription>{exportJob.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4" role="group" aria-label="Export format">
            <Button
              variant={format === 'pdf' ? 'default' : 'outline'}
              onClick={() => setFormat('pdf')}
              aria-pressed={format === 'pdf'}
            >
              <FileText className="h-4 w-4 mr-2" /> PDF report
            </Button>
            <Button
              variant={format === 'zip' ? 'default' : 'outline'}
              onClick={() => setFormat('zip')}
              aria-pressed={format === 'zip'}
            >
              <FileArchive className="h-4 w-4 mr-2" /> ZIP bundle
            </Button>
          </div>

          <div className="space-y-2" role="group" aria-label="Export options">
            <Label className="text-sm font-semibold">Include</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={options.includeTimeline}
                  onCheckedChange={() => toggleOption('includeTimeline')}
                  aria-label="Include timeline"
                />
                Timeline
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={options.includeGraphSnapshot}
                  onCheckedChange={() => toggleOption('includeGraphSnapshot')}
                  aria-label="Include graph snapshot"
                />
                Graph snapshot
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={options.includeSources}
                  onCheckedChange={() => toggleOption('includeSources')}
                  aria-label="Include sources"
                />
                Sources & provenance
              </label>
            </div>
          </div>

          {renderStatus()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Resumes automatically when you return.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportJob.cancel} aria-label="Cancel export">
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={exportJob.startNewExport}
              disabled={isStarting}
              aria-label="Start a new export job"
            >
              Start new export
            </Button>
            <Button onClick={exportJob.startExport} disabled={!canStart || isStarting} aria-label="Start export">
              {isStarting ? 'Starting…' : 'Start export'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
