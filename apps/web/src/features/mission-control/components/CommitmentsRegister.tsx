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

interface CommitmentsRegisterProps {
  plan: any
}

export default function CommitmentsRegister({
  plan,
}: CommitmentsRegisterProps) {
  if (!plan) return <div>No plan selected.</div>

  const commitments = plan.initiatives || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commitments Register</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commitment (Initiative)</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commitments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No commitments found.
                </TableCell>
              </TableRow>
            ) : (
              commitments.map((init: any) => (
                <TableRow key={init.id}>
                  <TableCell className="font-medium">{init.name}</TableCell>
                  <TableCell>
                    {init.owner ||
                      (init.assignedTo
                        ? init.assignedTo.join(', ')
                        : 'Unassigned')}
                  </TableCell>
                  <TableCell>
                    {init.endDate
                      ? new Date(init.endDate).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{init.priority || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        init.status === 'COMPLETED' ? 'default' : 'secondary'
                      }
                    >
                      {init.status}
                    </Badge>
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
