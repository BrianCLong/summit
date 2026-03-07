import React from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useCommandStatusContext } from '../CommandStatusProvider'
import { cn } from '@/lib/utils'

export function GlobalStatusBanner() {
  const { state, refresh } = useCommandStatusContext()
  const icon =
    state.banner.level === 'green' ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : state.banner.level === 'yellow' ? (
      <AlertTriangle className="h-5 w-5" />
    ) : (
      <AlertTriangle className="h-5 w-5" />
    )

  return (
    <Alert
      variant={
        state.banner.level === 'red'
          ? 'destructive'
          : state.banner.level === 'yellow'
            ? 'warning'
            : 'default'
      }
      className={cn(
        'rounded-none border-x-0 border-t border-b shadow-sm',
        state.banner.level === 'green' && 'bg-emerald-50 text-emerald-900',
        state.banner.level === 'yellow' && 'bg-amber-50 text-amber-900'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl">{icon}</div>
          <div>
            <AlertTitle className="flex items-center gap-2 text-base">
              {state.banner.headline}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {state.banner.detail}
            </AlertDescription>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.loading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-label="Refreshing" />
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>
    </Alert>
  )
}
