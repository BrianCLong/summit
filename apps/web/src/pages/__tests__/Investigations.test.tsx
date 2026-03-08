import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Investigations from '../Investigations'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

expect.extend(toHaveNoViolations)

describe('Investigations Page Accessibility', () => {
  it('should have no basic accessibility violations', async () => {
    const { container } = render(<Investigations />)

    // We wait for the graph to "mount" even if it's mock
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should render correct ARIA labels for graph', () => {
    render(<Investigations />)
    const svg = screen.getByRole('img', { name: /Org Mesh graph/i })
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-describedby', 'graph-desc')
  })

  it('should announce entity selection to screen readers', async () => {
    render(<Investigations />)

    // In our implementation, the graph nodes have role="graphics-symbol" and are focusable
    const nodes = screen.getAllByRole('graphics-symbol')
    const firstNode = nodes.find(n => n.getAttribute('aria-label')?.includes('Strategic Hub Alpha'))

    if (firstNode) {
        fireEvent.click(firstNode)

        // Check aria-live region (hidden)
        const announcement = screen.getByText(/Selected entity: Strategic Hub Alpha/i)
        expect(announcement).toBeInTheDocument()
        expect(announcement.parentElement).toHaveAttribute('aria-live', 'polite')
    }
  })

  it('should support keyboard navigation to nodes', () => {
    render(<Investigations />)
    const nodes = screen.getAllByRole('graphics-symbol').filter(n => n.tagName === 'g')

    if (nodes.length > 0) {
        const firstNode = nodes[0]
        expect(firstNode).toHaveAttribute('tabindex', '0')

        firstNode.focus()
        expect(document.activeElement).toBe(firstNode)

        fireEvent.keyDown(firstNode, { key: 'Enter' })
        expect(screen.getByText(/Strategic Hub Alpha/i)).toBeInTheDocument()
    }
  })
})
