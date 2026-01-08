/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../Table'
import { tokenVar } from '@/theme/tokens'

type AnalystRow = {
  id: string
  name: string
  role: string
  status: 'Active' | 'Paused' | 'Blocked'
  alerts: number
}

const rows: AnalystRow[] = [
  {
    id: 'A-1992',
    name: 'J. Alvarez',
    role: 'Lead Analyst',
    status: 'Active',
    alerts: 12,
  },
  {
    id: 'A-2001',
    name: 'R. Smith',
    role: 'Responder',
    status: 'Active',
    alerts: 7,
  },
  {
    id: 'A-2122',
    name: 'L. Chen',
    role: 'Reviewer',
    status: 'Paused',
    alerts: 2,
  },
  {
    id: 'A-2188',
    name: 'M. Adeyemi',
    role: 'Responder',
    status: 'Blocked',
    alerts: 0,
  },
]

const meta: Meta<typeof Table> = {
  title: 'Design System/Table',
  component: Table,
}

export default meta
type Story = StoryObj<typeof Table>

export const WithAnalystData: Story = {
  render: () => (
    <div
      style={{
        padding: tokenVar('ds-space-md'),
        boxShadow: 'var(--ds-shadow-sm)',
        borderRadius: tokenVar('ds-radius-lg'),
      }}
    >
      <Table>
        <TableCaption>Active mission staffing</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Analyst</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Open alerts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.id}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell className="text-right">{row.alerts}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
}
