import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface StrategyWallProps {
  plan: any
  loading: boolean
}

export default function StrategyWall({ plan, loading }: StrategyWallProps) {
  if (loading) {
    return <div>Loading Strategy Wall...</div>
  }

  if (!plan) {
    return <div>No active strategic plan found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle>Goals (Objectives)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.objectives?.map((obj: any) => (
                <div key={obj.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{obj.name}</h4>
                    <Badge
                      variant={
                        obj.status === 'COMPLETED' ? 'default' : 'secondary'
                      }
                    >
                      {obj.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {obj.description}
                  </p>
                  <div className="mt-2 w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${obj.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle>Bets (Initiatives)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.initiatives?.map((init: any) => (
                <div key={init.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{init.name}</h4>
                    <Badge variant="outline">{init.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {init.description}
                  </p>
                  {init.budgetUtilization !== null && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Budget: {Math.round(init.budgetUtilization)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle>Metrics (KPIs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.kpis?.map((kpi: any) => (
                <div
                  key={kpi.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold text-sm">{kpi.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Target: {kpi.targetValue} {kpi.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {kpi.currentValue}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {kpi.unit}
                      </span>
                    </div>
                    <div
                      className={`text-xs ${
                        kpi.trend === 'UP'
                          ? 'text-green-500'
                          : kpi.trend === 'DOWN'
                            ? 'text-red-500'
                            : 'text-gray-500'
                      }`}
                    >
                      {kpi.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
