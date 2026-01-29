/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Label } from '../Label'
import { Slider } from '../Slider'
import { Switch } from '../switch'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Switch> = {
  title: 'Design System/Inputs/Switch & Slider',
  component: Switch,
}

export default meta
type Story = StoryObj<typeof Switch>

export const Toggles: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokenVar('ds-space-md'),
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <Switch defaultChecked id="feature" />
        <span>Enable mission briefings</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor="risk">Risk threshold</Label>
        <Slider id="risk" defaultValue={[60]} min={0} max={100} step={10} />
      </div>
    </div>
  ),
}
