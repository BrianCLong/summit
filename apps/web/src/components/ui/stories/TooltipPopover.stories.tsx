/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Button } from '../Button'
import { Popover, PopoverContent, PopoverTrigger } from '../Popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../Tooltip'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Tooltip> = {
  title: 'Design System/Overlays',
  component: Tooltip,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const TooltipExample: Story = {
  render: () => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          Explains the control without clutter.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const PopoverMenu: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Open quick actions</Button>
      </PopoverTrigger>
      <PopoverContent
        style={{
          display: 'grid',
          gap: tokenVar('ds-space-xs'),
          width: '240px',
        }}
      >
        <p className="text-sm font-semibold">Investigate</p>
        <Button variant="ghost" className="justify-start">
          Link entities
        </Button>
        <Button variant="ghost" className="justify-start">
          Add note
        </Button>
        <Button variant="ghost" className="justify-start">
          Share to workspace
        </Button>
      </PopoverContent>
    </Popover>
  ),
}
