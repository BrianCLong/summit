import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState, QuickAction } from './EmptyState'
import { Database, Settings } from 'lucide-react'

describe('EmptyState', () => {
  it('renders with required props', () => {
    render(<EmptyState title="No data found" />)

    expect(screen.getByRole('region', { name: /empty state/i })).toBeDefined()
    expect(screen.getByText('No data found')).toBeDefined()
  })

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No data found"
        description="Try adjusting your filters"
      />
    )

    expect(screen.getByText('Try adjusting your filters')).toBeDefined()
  })

  it('renders primary action when provided', () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="No data found"
        action={{ label: 'Create New', onClick: handleClick }}
      />
    )

    const button = screen.getByRole('button', { name: /create new/i })
    expect(button).toBeDefined()

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders primary action with custom variant', () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="No data found"
        action={{ label: 'Retry', onClick: handleClick, variant: 'outline' }}
      />
    )

    const button = screen.getByRole('button', { name: /retry/i })
    expect(button.className).toContain('border')
  })

  it('does not render quick actions when not provided', () => {
    render(<EmptyState title="No data found" />)

    const quickActionsGroup = screen.queryByRole('group', { name: /quick actions/i })
    expect(quickActionsGroup).toBeNull()
  })

  it('renders quick actions when provided', () => {
    const quickActions: QuickAction[] = [
      { label: 'Import Data', onClick: vi.fn(), id: 'import' },
      { label: 'View Docs', onClick: vi.fn(), id: 'docs' },
    ]

    render(
      <EmptyState
        title="No data found"
        quickActions={quickActions}
      />
    )

    const quickActionsGroup = screen.getByRole('group', { name: /quick actions/i })
    expect(quickActionsGroup).toBeDefined()

    expect(screen.getByRole('button', { name: /import data/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /view docs/i })).toBeDefined()
  })

  it('calls quick action onClick handlers', () => {
    const handleImport = vi.fn()
    const handleDocs = vi.fn()

    const quickActions: QuickAction[] = [
      { label: 'Import Data', onClick: handleImport, id: 'import' },
      { label: 'View Docs', onClick: handleDocs, id: 'docs' },
    ]

    render(
      <EmptyState
        title="No data found"
        quickActions={quickActions}
      />
    )

    const importButton = screen.getByRole('button', { name: /import data/i })
    const docsButton = screen.getByRole('button', { name: /view docs/i })

    fireEvent.click(importButton)
    expect(handleImport).toHaveBeenCalledTimes(1)
    expect(handleDocs).not.toHaveBeenCalled()

    fireEvent.click(docsButton)
    expect(handleDocs).toHaveBeenCalledTimes(1)
    expect(handleImport).toHaveBeenCalledTimes(1)
  })

  it('renders quick actions with icons', () => {
    const quickActions: QuickAction[] = [
      { label: 'Settings', onClick: vi.fn(), icon: Settings, id: 'settings' },
      { label: 'Database', onClick: vi.fn(), icon: Database, id: 'database' },
    ]

    render(
      <EmptyState
        title="No data found"
        quickActions={quickActions}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    const databaseButton = screen.getByRole('button', { name: /database/i })

    expect(settingsButton).toBeDefined()
    expect(databaseButton).toBeDefined()
  })

  it('uses fallback id when quickAction id is not provided', () => {
    const quickActions: QuickAction[] = [
      { label: 'Action 1', onClick: vi.fn() },
      { label: 'Action 2', onClick: vi.fn() },
    ]

    render(
      <EmptyState
        title="No data found"
        quickActions={quickActions}
      />
    )

    // Should render without errors and have unique keys
    expect(screen.getByRole('button', { name: /action 1/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /action 2/i })).toBeDefined()
  })

  it('renders with different icon types', () => {
    const { rerender } = render(<EmptyState title="No data" icon="search" />)
    expect(screen.getByRole('region')).toBeDefined()

    rerender(<EmptyState title="No data" icon="chart" />)
    expect(screen.getByRole('region')).toBeDefined()

    rerender(<EmptyState title="No data" icon="folder" />)
    expect(screen.getByRole('region')).toBeDefined()

    rerender(<EmptyState title="No data" icon="database" />)
    expect(screen.getByRole('region')).toBeDefined()
  })

  it('renders with custom className', () => {
    render(<EmptyState title="No data" className="custom-class" />)

    const region = screen.getByRole('region', { name: /empty state/i })
    expect(region.className).toContain('custom-class')
  })

  it('supports keyboard navigation for buttons', () => {
    const handlePrimary = vi.fn()
    const handleQuick = vi.fn()

    const quickActions: QuickAction[] = [
      { label: 'Quick Action', onClick: handleQuick, id: 'quick' },
    ]

    render(
      <EmptyState
        title="No data found"
        action={{ label: 'Primary', onClick: handlePrimary }}
        quickActions={quickActions}
      />
    )

    const primaryButton = screen.getByRole('button', { name: /primary/i })
    const quickButton = screen.getByRole('button', { name: /quick action/i })

    // Both buttons should be focusable
    primaryButton.focus()
    expect(document.activeElement).toBe(primaryButton)

    quickButton.focus()
    expect(document.activeElement).toBe(quickButton)
  })

  it('has proper aria attributes', () => {
    render(
      <EmptyState
        title="No data found"
        description="Please import some data to get started"
      />
    )

    const region = screen.getByRole('region', { name: /empty state/i })
    expect(region).toBeDefined()

    const title = screen.getByText('No data found')
    expect(title.id).toBe('empty-state-title')

    const description = screen.getByText('Please import some data to get started')
    expect(description.id).toBe('empty-state-description')
  })

  it('renders both primary action and quick actions together', () => {
    const handlePrimary = vi.fn()
    const handleQuick1 = vi.fn()
    const handleQuick2 = vi.fn()

    const quickActions: QuickAction[] = [
      { label: 'Quick 1', onClick: handleQuick1, id: 'q1' },
      { label: 'Quick 2', onClick: handleQuick2, id: 'q2' },
    ]

    render(
      <EmptyState
        title="No data found"
        action={{ label: 'Primary Action', onClick: handlePrimary }}
        quickActions={quickActions}
      />
    )

    expect(screen.getByRole('button', { name: /primary action/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /quick 1/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /quick 2/i })).toBeDefined()
  })
})
