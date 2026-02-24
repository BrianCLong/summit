import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import React from 'react'

describe('EmptyState', () => {
  it('renders correctly with default icon', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    // Default icon is 'file' (FileX)
    // We can check if the icon container has aria-hidden
    const title = screen.getByText('No items')
    const container = title.parentElement?.querySelector('div.rounded-full')
    expect(container).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders correctly with chart icon', () => {
    render(<EmptyState title="No metrics" icon="chart" />)
    expect(screen.getByText('No metrics')).toBeInTheDocument()
    // Verify icon container is hidden
    const title = screen.getByText('No metrics')
    const container = title.parentElement?.querySelector('div.rounded-full')
    expect(container).toHaveAttribute('aria-hidden', 'true')
    // Verify it doesn't render "chart" text
    expect(screen.queryByText('chart')).not.toBeInTheDocument()
  })

  it('renders correctly with folder icon', () => {
    render(<EmptyState title="No cases" icon="folder" />)
    expect(screen.getByText('No cases')).toBeInTheDocument()
    // Verify icon container is hidden
    const title = screen.getByText('No cases')
    const container = title.parentElement?.querySelector('div.rounded-full')
    expect(container).toHaveAttribute('aria-hidden', 'true')
    // Verify it doesn't render "folder" text
    expect(screen.queryByText('folder')).not.toBeInTheDocument()
  })

  it('renders fallback icon for unknown string icon', () => {
    // Cast to any to bypass TS check for test
    render(<EmptyState title="Unknown" icon={"unknown_icon" as any} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()

    // Verify it doesn't render "unknown_icon" text
    expect(screen.queryByText('unknown_icon')).not.toBeInTheDocument()

    // It should render fallback icon (FileX). We can't easily check the icon type without checking SVG path or class name if distinctive
    // but ensuring text is not rendered is the main fix.
  })

  it('renders custom ReactNode icon', () => {
    render(<EmptyState title="Custom" icon={<span data-testid="custom-icon">Custom</span>} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})
