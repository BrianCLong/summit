import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function TraceabilityGraph() {
  return (
    <Card className="h-[500px]">
      <CardHeader>
        <CardTitle>Traceability Graph</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Graph Visualization Placeholder (Wish → Spec → Epic → PR → Shipped)
        </p>
      </CardContent>
    </Card>
  )
}
