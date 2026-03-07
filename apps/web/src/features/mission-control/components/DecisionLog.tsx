import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

interface DecisionLogProps {
  plan: any
}

export default function DecisionLog({ plan }: DecisionLogProps) {
  if (!plan) return <div>No plan selected.</div>

  const risks = plan.risks || []
  // Flatten mitigations to simulate decisions
  const decisions = risks.flatMap((risk: any) =>
    (risk.mitigationStrategies || []).map((mit: any) => ({
      decision: `Mitigate ${risk.name}: ${mit.description}`,
      type: 'RISK_MITIGATION',
      owner: mit.owner,
      date: mit.deadline,
      status: mit.status,
    }))
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Log & Trade-off Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Decision</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decisions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No decisions recorded.
                </TableCell>
              </TableRow>
            ) : (
              decisions.map((dec: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{dec.decision}</TableCell>
                  <TableCell>{dec.type}</TableCell>
                  <TableCell>{dec.owner}</TableCell>
                  <TableCell>
                    {dec.date ? new Date(dec.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dec.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
