/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Button } from '../Button'
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../toast'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Toast> = {
  title: 'Design System/Feedback/Toast',
  component: Toast,
}

export default meta
type Story = StoryObj<typeof Toast>

export const InlineToasts: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    const [openReminder, setOpenReminder] = React.useState(false)

    return (
      <ToastProvider swipeDirection="right">
        <div
          style={{
            display: 'flex',
            gap: tokenVar('ds-space-sm'),
            flexWrap: 'wrap',
          }}
        >
          <Button
            onClick={() => {
              setOpen(true)
              setOpenReminder(false)
            }}
          >
            Show success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setOpenReminder(true)
              setOpen(false)
            }}
          >
            Show reminder toast
          </Button>
        </div>

        <Toast open={open} onOpenChange={setOpen} duration={4000}>
          <ToastTitle>Saved</ToastTitle>
          <ToastDescription>
            Investigation settings were updated.
          </ToastDescription>
          <ToastAction altText="undo">Undo</ToastAction>
        </Toast>

        <Toast
          open={openReminder}
          onOpenChange={setOpenReminder}
          duration={4500}
        >
          <ToastTitle>Reminder</ToastTitle>
          <ToastDescription>
            Escalation runbook has pending approvals.
          </ToastDescription>
          <ToastAction altText="view">View</ToastAction>
        </Toast>

        <ToastViewport />
      </ToastProvider>
    )
  },
}
