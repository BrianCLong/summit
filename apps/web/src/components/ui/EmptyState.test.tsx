import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders known icon "search"', () => {
    const { container } = render(<EmptyState icon="search" title="No results" />)
    const icon = container.querySelector('svg.lucide-search')
    expect(icon).toBeInTheDocument()
    expect(screen.queryByText('search')).not.toBeInTheDocument()
  })

  it('renders known icon "chart"', () => {
    const { container } = render(<EmptyState icon="chart" title="No metrics" />)

    // Check if any SVG is rendered
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()

    // Verify it is NOT FileX (fallback)
    expect(icon?.classList.contains('lucide-file-x')).toBe(false)

    // Verify text is gone
    expect(screen.queryByText('chart')).not.toBeInTheDocument()
  })

  it('renders fallback icon for unknown string', () => {
    const { container } = render(<EmptyState icon="unknown-icon" title="No metrics" />)

    // Should NOT render text "unknown-icon"
    expect(screen.queryByText('unknown-icon')).not.toBeInTheDocument()

    // Should render fallback icon (FileX -> lucide-file-x)
    const icon = container.querySelector('svg.lucide-file-x')
    expect(icon).toBeInTheDocument()
  })
})
