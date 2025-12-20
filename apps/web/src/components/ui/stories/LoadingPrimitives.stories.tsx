// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Progress } from '../progress'
import { Skeleton } from '../Skeleton'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Skeleton> = {
  title: 'Design System/Feedback/Skeleton & Progress',
  component: Skeleton,
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const LoadingStates: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: tokenVar('ds-space-sm'),
        maxWidth: '520px',
      }}
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Progress value={48} />
    </div>
  ),
}
