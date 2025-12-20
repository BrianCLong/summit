// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Pagination } from '../Pagination'
import { tokenVar } from '@/theme/tokens'

const meta: Meta<typeof Pagination> = {
  title: 'Design System/Pagination',
  component: Pagination,
}

export default meta
type Story = StoryObj<typeof Pagination>

export const WithState: Story = {
  render: () => {
    const [page, setPage] = React.useState(2)

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokenVar('ds-space-sm'),
          width: 'min(520px, 100%)',
        }}
      >
        <p className="text-sm text-muted-foreground">
          Showing results {(page - 1) * 10 + 1}–{page * 10} of 120
        </p>
        <Pagination
          currentPage={page}
          totalPages={12}
          onPageChange={setPage}
          hasNext={page < 12}
          hasPrevious={page > 1}
        />
      </div>
    )
  },
}
