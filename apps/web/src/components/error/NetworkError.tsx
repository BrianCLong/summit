import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { WifiOff } from 'lucide-react'

interface NetworkErrorProps {
  onRetry?: () => void
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Connection Lost
          </h2>
          <p className="text-sm text-muted-foreground">
            Please check your internet connection and try again.
          </p>
        </div>

        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </Card>
    </div>
  )
}
