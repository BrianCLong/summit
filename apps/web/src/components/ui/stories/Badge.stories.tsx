// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'

import { Badge } from '../Badge'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Badge> = {
  title: 'Design System/Badge',
  component: Badge,
}

export default meta
type Story = StoryObj<typeof Badge>

export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: tokenVar('ds-space-xs'),
        padding: tokenVar('ds-space-md'),
        flexWrap: 'wrap',
      }}
    >
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge>Default</Badge>
      <Badge className="bg-intel-700 text-white">Intel</Badge>
      <Badge className="bg-green-100 text-green-800">Success</Badge>
    </div>
  ),
}
