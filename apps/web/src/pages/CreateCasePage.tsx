import React from 'react'
import { ArrowRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function CreateCasePage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create a Case</h1>
        <p className="text-muted-foreground mt-1">
          Capture a new investigation case by starting from existing signals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Choose a starting point
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Begin with an investigation to anchor entities, alerts, and
            relationships into a case timeline.
          </p>
          <Button
            className="gap-2"
            onClick={() => navigate('/explore')}
          >
            Start from Investigations
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
