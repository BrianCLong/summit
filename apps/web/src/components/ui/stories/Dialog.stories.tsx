// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Button } from '../Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../Dialog'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Dialog> = {
  title: 'Design System/Modal',
  component: Dialog,
}

export default meta
type Story = StoryObj<typeof Dialog>

export const ConfirmationModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate to incident?</DialogTitle>
          <DialogDescription>
            Triaging as an incident will page the on-call SRE and notify the
            trust & safety bridge channel.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          style={{
            gap: tokenVar('ds-space-sm'),
            marginTop: tokenVar('ds-space-md'),
          }}
        >
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Escalate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
