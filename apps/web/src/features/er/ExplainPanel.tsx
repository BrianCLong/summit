import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

export interface ExplainPanelProps {
  details?: {
    score?: number
    confidence?: number
    method?: string
    threshold?: number
    rationale?: string[]
    featureContributions?: Array<{
      feature: string
      value: number | boolean
      weight: number
      contribution: number
      normalizedContribution: number
    }>
  }
}

export const ExplainPanel: React.FC<ExplainPanelProps> = ({ details }) => {
  const [showContributions, setShowContributions] = useState(false)

  if (!details) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explanation</CardTitle>
        </CardHeader>
        <CardContent>No data</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4" /> ER Explainer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Score:</span>
          <Badge
            variant={
              details.score && details.score > 0.8 ? 'default' : 'secondary'
            }
          >
            {details.score !== undefined
              ? Math.round(details.score * 100)
              : '—'}
            %
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Confidence:</span>
          <span>
            {details.confidence !== undefined
              ? `${Math.round(details.confidence * 100)}%`
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Method:</span>
          <span>{details.method ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Threshold:</span>
          <span>
            {details.threshold !== undefined
              ? `${Math.round(details.threshold * 100)}%`
              : '—'}
          </span>
        </div>
        <div>
          <strong>Rationale:</strong>
          {details.rationale && details.rationale.length > 0 ? (
            <ul className="list-disc pl-5">
              {details.rationale.map((rationale, index) => (
                <li key={index}>{rationale}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">
              No rationale provided.
            </div>
          )}
        </div>
        {details.featureContributions &&
          details.featureContributions.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowContributions(prev => !prev)}
              >
                {showContributions ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" /> Hide feature
                    contributions
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" /> Show feature
                    contributions
                  </>
                )}
              </Button>
              {showContributions && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Contribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.featureContributions.map(row => (
                        <TableRow key={row.feature}>
                          <TableCell className="font-medium">
                            {row.feature}
                          </TableCell>
                          <TableCell>
                            {typeof row.value === 'boolean'
                              ? row.value
                                ? 'true'
                                : 'false'
                              : row.value.toFixed(3)}
                          </TableCell>
                          <TableCell>
                            {(row.weight * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            {(row.normalizedContribution * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  )
}
