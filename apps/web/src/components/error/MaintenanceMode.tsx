import React from 'react'
import { Card } from '@/components/ui/Card'
import { Hammer } from 'lucide-react'

export function MaintenanceMode() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <Hammer className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Maintenance Mode
          </h2>
          <p className="text-sm text-muted-foreground">
            We are currently performing scheduled maintenance. Please check back
            later.
          </p>
        </div>
      </Card>
    </div>
  )
}
