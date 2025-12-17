import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AccessDenied() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access this resource.
          </p>
        </div>

        <Button onClick={() => navigate('/')} variant="outline">
          Return Home
        </Button>
      </Card>
    </div>
  )
}
