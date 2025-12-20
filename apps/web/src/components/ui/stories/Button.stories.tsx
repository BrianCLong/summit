// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'

import { Button } from '../Button'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  args: {
    children: 'Primary action',
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'default' },
}

export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: tokenVar('ds-space-sm'),
        padding: tokenVar('ds-space-md'),
      }}
    >
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="intel">Intel</Button>
      <Button variant="destructive">Danger</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: tokenVar('ds-space-sm'),
        padding: tokenVar('ds-space-md'),
      }}
    >
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Icon button">
        🚀
      </Button>
    </div>
  ),
}
