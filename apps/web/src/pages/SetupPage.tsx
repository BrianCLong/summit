import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useFirstRunFunnel } from '@/hooks/useFirstRunFunnel'
import { trackFirstRunEvent } from '@/telemetry/metrics'

const statusLabels = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
}

const statusVariants = {
  not_started: 'secondary',
  in_progress: 'warning',
  complete: 'success',
} as const

export default function SetupPage() {
  const { milestones, completionCount, completionPercent, nextMilestone } =
    useFirstRunFunnel()

  useEffect(() => {
    trackFirstRunEvent('first_run_funnel_viewed', {
      milestoneId: 'setup',
      source: 'setup_page',
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Getting Started</h1>
          <p className="text-muted-foreground mt-1">
            Complete the first-run checklist to reach your first signal faster.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="intel">
            {completionCount} of {milestones.length} complete
          </Badge>
          <Badge variant="info">{completionPercent}% done</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="text-lg">Setup checklist</CardTitle>
          {nextMilestone ? (
            <p className="text-sm text-muted-foreground">
              Next up: {nextMilestone.title}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your first-run funnel is complete. Keep building momentum.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            {milestones.map(milestone => (
              <div
                key={milestone.id}
                className="rounded-lg border p-4 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {milestone.status === 'complete' && (
                        <CheckCircle2
                          className="h-5 w-5 text-emerald-500"
                          aria-hidden="true"
                        />
                      )}
                      <h3 className="text-base font-semibold">
                        {milestone.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariants[milestone.status]}>
                      {statusLabels[milestone.status]}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link to={milestone.route}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div>
                    <dt className="font-medium text-foreground">Entry point</dt>
                    <dd>{milestone.entryPoint}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Required inputs</dt>
                    <dd>{milestone.requiredInputs}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Success criteria</dt>
                    <dd>{milestone.successCriteria}</dd>
                  </div>
                </dl>
                <div className="text-xs text-muted-foreground">
                  Failure states: {milestone.failureStates.join(' ')}
                </div>
              </div>
            ))}
          </div>

          {nextMilestone ? (
            <Button asChild>
              <Link to={nextMilestone.route}>Continue setup</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/">Return to Home</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
