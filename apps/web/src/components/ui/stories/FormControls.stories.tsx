/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Input } from '../Input'
import { Label } from '../Label'
import { Textarea } from '../Textarea'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Input> = {
  title: 'Design System/Forms/Input',
  component: Input,
  subcomponents: { Textarea },
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Input>

export const TextInput: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokenVar('ds-space-sm'),
        width: 'min(420px, 90vw)',
      }}
    >
      <Label htmlFor="search">Search</Label>
      <Input id="search" placeholder="Find investigations" />
    </div>
  ),
}

export const WithValidation: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokenVar('ds-space-xs'),
        width: 'min(420px, 90vw)',
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="analyst@intelgraph.ai" />
      <p className="text-sm text-destructive">
        Please supply a mission-safe email.
      </p>
    </div>
  ),
}

export const TextAreaField: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokenVar('ds-space-sm'),
        width: 'min(520px, 90vw)',
      }}
    >
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        id="notes"
        minRows={4}
        placeholder="Capture intel summaries or action items..."
      />
    </div>
  ),
}
