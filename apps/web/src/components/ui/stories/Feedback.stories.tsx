/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertDescription, AlertTitle } from '../Alert'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Alert> = {
  title: 'Design System/Feedback/Alert',
  component: Alert,
}

export default meta
type Story = StoryObj<typeof Alert>

export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: tokenVar('ds-space-sm'),
        maxWidth: '620px',
      }}
    >
      <Alert variant="success">
        <AlertTitle>Ready</AlertTitle>
        <AlertDescription>
          The ingestion pipeline is healthy and ready for new documents.
        </AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>
          Analyst coverage dips below target during APAC hours.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Action required</AlertTitle>
        <AlertDescription>
          Anomalous download behavior detected across 3 endpoints.
        </AlertDescription>
      </Alert>
    </div>
  ),
}
