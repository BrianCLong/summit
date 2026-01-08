import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface HealthSignalsProps {
  progress?: any
  kpis?: any[]
}

export default function HealthSignals({
  progress,
  kpis = [],
}: HealthSignalsProps) {
  if (!progress)
    return (
      <div className="text-muted-foreground p-4">
        Select a plan to view health signals.
      </div>
    )

  const healthScore = progress.healthScore ?? 0
  const signals = kpis.slice(0, 3)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Plan Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${healthScore >= 80 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}
          >
            {healthScore}
          </div>
          <p className="text-xs text-muted-foreground">
            Overall automated score
          </p>
        </CardContent>
      </Card>

      {signals.map((kpi: any) => (
        <Card key={kpi.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpi.currentValue} {kpi.unit}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {kpi.targetValue}
            </p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {progress.riskSummary?.critical || 0} Critical
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.riskSummary?.high || 0} High Risks
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
