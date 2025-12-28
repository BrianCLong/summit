import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { useFeatureFlags } from '@/contexts/FeatureFlagContext'
import { withSpan } from '@/telemetry/otel'
import { trackExperimentError, trackExperimentEvent } from './telemetry'

const sampleSignals = [
  {
    id: 'sig-1031',
    label: 'Cross-border IP cluster',
    severity: 'high',
    source: 'Network telemetry',
    tags: ['ip', 'cluster', 'geo'],
  },
  {
    id: 'sig-1177',
    label: 'Unusual vendor spend delta',
    severity: 'medium',
    source: 'Finance feed',
    tags: ['vendor', 'spend', 'variance'],
  },
  {
    id: 'sig-1204',
    label: 'Credential reuse burst',
    severity: 'high',
    source: 'Identity audit',
    tags: ['identity', 'auth', 'burst'],
  },
  {
    id: 'sig-1299',
    label: 'Low-confidence OSINT spike',
    severity: 'low',
    source: 'OSINT stream',
    tags: ['osint', 'mentions'],
  },
  {
    id: 'sig-1366',
    label: 'Tradecraft pattern overlap',
    severity: 'medium',
    source: 'Analyst notes',
    tags: ['pattern', 'overlap'],
  },
]

const pulseBuckets = [
  { label: '0-6h', value: 18 },
  { label: '6-12h', value: 42 },
  { label: '12-18h', value: 29 },
  { label: '18-24h', value: 11 },
]

function SignalFocusLens() {
  const [search, setSearch] = React.useState('')
  const [severity, setSeverity] = React.useState<'all' | 'high' | 'medium' | 'low'>(
    'all'
  )

  const filteredSignals = React.useMemo(() => {
    const start = performance.now()
    const result = withSpan('experimental.signal-focus.filter', () => {
      return sampleSignals.filter(signal => {
        const matchesSearch =
          signal.label.toLowerCase().includes(search.toLowerCase()) ||
          signal.tags.some(tag => tag.includes(search.toLowerCase()))
        const matchesSeverity = severity === 'all' || signal.severity === severity
        return matchesSearch && matchesSeverity
      })
    })

    trackExperimentEvent({
      experiment: 'signal-focus-lens',
      event: 'performance',
      metadata: {
        duration_ms: Math.round(performance.now() - start),
        results: result.length,
      },
    })

    return result
  }, [search, severity])

  React.useEffect(() => {
    trackExperimentEvent({
      experiment: 'signal-focus-lens',
      event: 'activation',
      metadata: {
        severity,
        query: search,
      },
    })
  }, [search, severity])

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Signal Focus Lens</h2>
          <p className="text-sm text-muted-foreground">
            Explore read-only signal groups with alternative clustering cues.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          Experimental
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Filter by label or tag"
          className="max-w-xs"
          aria-label="Filter signals"
        />
        <div className="flex items-center gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map(level => (
            <Button
              key={level}
              variant={severity === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverity(level)}
            >
              {level === 'all' ? 'All' : level}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredSignals.map(signal => (
          <div
            key={signal.id}
            className="rounded-lg border border-muted px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{signal.label}</div>
                <div className="text-xs text-muted-foreground">
                  {signal.source}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="capitalize"
              >
                {signal.severity}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {signal.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        {filteredSignals.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No signals match this experimental filter.
          </div>
        )}
      </div>
    </Card>
  )
}

function PatternPulse() {
  React.useEffect(() => {
    trackExperimentEvent({
      experiment: 'pattern-pulse',
      event: 'activation',
      metadata: { buckets: pulseBuckets.length },
    })
  }, [])

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pattern Pulse</h2>
          <p className="text-sm text-muted-foreground">
            Preview a temporal pulse of non-authoritative activity overlays.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          Preview
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {pulseBuckets.map(bucket => (
          <div key={bucket.label} className="rounded-lg border border-muted p-4">
            <div className="text-xs uppercase text-muted-foreground">
              {bucket.label}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${bucket.value}%` }}
                />
              </div>
              <span className="text-sm font-medium">{bucket.value}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Pulse values are synthetic and do not alter GA metrics or claims.
      </div>
    </Card>
  )
}

export default function ExperimentalPreviewPage() {
  const { isEnabled } = useFeatureFlags()
  const [feedbackSent, setFeedbackSent] = React.useState(false)

  const signalFocusEnabled = isEnabled('exp.signal_focus_lens', false)
  const patternPulseEnabled = isEnabled('exp.pattern_pulse', false)

  const handleConfusion = () => {
    trackExperimentEvent({
      experiment: 'preview-lane',
      event: 'confusion',
      metadata: { action: 'user_confusion' },
    })
    setFeedbackSent(true)
  }

  const handleDismiss = () => {
    trackExperimentEvent({
      experiment: 'preview-lane',
      event: 'dismissal',
      metadata: { action: 'dismiss_preview' },
    })
    setFeedbackSent(false)
  }

  React.useEffect(() => {
    trackExperimentEvent({
      experiment: 'preview-lane',
      event: 'activation',
      metadata: { surface: 'experimental-preview-page' },
    })

    const handleError = (event: ErrorEvent) => {
      if (event.error instanceof Error) {
        trackExperimentError('preview-lane', event.error, {
          source: event.filename ?? 'unknown',
        })
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">
              Preview Lane
            </Badge>
            <Badge variant="outline">Experimental</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            Experimental Insights (Read-only)
          </h1>
          <p className="text-sm text-muted-foreground">
            These modules are isolated from GA surfaces and can be disabled at
            any time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            Exit Preview
          </Button>
          <Button size="sm" onClick={handleConfusion}>
            {feedbackSent ? 'Feedback sent' : 'Was this confusing?'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {signalFocusEnabled ? (
          <SignalFocusLens />
        ) : (
          <Card className="space-y-3 border-dashed p-6 text-sm text-muted-foreground">
            Signal Focus Lens is currently disabled.
          </Card>
        )}
        {patternPulseEnabled ? (
          <PatternPulse />
        ) : (
          <Card className="space-y-3 border-dashed p-6 text-sm text-muted-foreground">
            Pattern Pulse is currently disabled.
          </Card>
        )}
      </div>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Experiment Guardrails</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Preview lane only: no navigation exposure or GA mutations.</li>
          <li>Read-only overlays with synthetic data and client-only filters.</li>
          <li>All activation, error, and confusion signals are logged.</li>
        </ul>
      </Card>
    </div>
  )
}
