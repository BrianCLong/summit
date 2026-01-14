import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('does not render quick actions when none are provided', () => {
    render(<EmptyState title="No data" description="Nothing yet." />)

    expect(
      screen.queryByRole('group', { name: /quick actions/i })
    ).not.toBeInTheDocument()
  })

  it('renders quick actions with predictable focus order', async () => {
    const user = userEvent.setup()
    const onPrimary = vi.fn()
    const onFirst = vi.fn()
    const onSecond = vi.fn()

    render(
      <EmptyState
        title="No alerts"
        description="Connect a source to see alerts."
        action={{ label: 'Connect source', onClick: onPrimary }}
        quickActions={[
          { id: 'first', label: 'Review cases', onClick: onFirst },
          { id: 'second', label: 'Explore', onClick: onSecond },
        ]}
      />
    )

    expect(screen.getByRole('region', { name: 'No alerts' })).toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Connect source' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Review cases' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Explore' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Review cases' }))
    expect(onFirst).toHaveBeenCalledTimes(1)
  })
})
