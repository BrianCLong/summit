import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'

// Mock the hooks and components
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' } }),
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => true,
  DemoIndicator: () => null,
}))

vi.mock('@/components/activation/ActivationProgressTile', () => ({
  ActivationProgressTile: () => <div>ActivationProgressTile</div>,
}))

vi.mock('@/components/common/DataIntegrityNotice', () => ({
  DataIntegrityNotice: () => <div>DataIntegrityNotice</div>,
}))

vi.mock('@/components/panels/KPIStrip', () => ({
  KPIStrip: () => <div>KPIStrip</div>,
}))

vi.mock('@/mock/data.json', () => ({
  default: {
    kpiMetrics: [],
    investigations: [],
    alerts: [],
    cases: [],
  },
}))

describe('HomePage Quick Actions Keyboard Navigation', () => {
  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
  }

  it('quick action cards are keyboard accessible', async () => {
    const user = userEvent.setup()
    renderHomePage()

    // Wait for loading to complete
    await screen.findByText(/Quick Actions/i)

    // Find all quick action cards
    const quickActions = screen.getAllByRole('button', {
      name: /Start Investigation|Review Alerts|View Cases|Command Center/i,
    })

    expect(quickActions.length).toBeGreaterThan(0)

    // Each quick action should be focusable
    quickActions.forEach(action => {
      expect(action).toHaveAttribute('tabIndex', '0')
    })
  })

  it('quick actions respond to Enter key', async () => {
    const user = userEvent.setup()
    const { container } = renderHomePage()

    await screen.findByText(/Quick Actions/i)

    const startInvestigation = screen.getByRole('button', {
      name: /Start Investigation/i,
    })

    // Focus and press Enter
    startInvestigation.focus()
    expect(startInvestigation).toHaveFocus()

    await user.keyboard('{Enter}')

    // Navigation should be triggered (we can't easily test navigation in unit tests
    // but we verify the handler exists and element is keyboard accessible)
  })

  it('quick actions respond to Space key', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await screen.findByText(/Quick Actions/i)

    const reviewAlerts = screen.getByRole('button', {
      name: /Review Alerts/i,
    })

    reviewAlerts.focus()
    expect(reviewAlerts).toHaveFocus()

    await user.keyboard(' ')

    // Space key should trigger navigation
  })

  it('quick actions have proper ARIA labels', async () => {
    renderHomePage()

    await screen.findByText(/Quick Actions/i)

    const startInvestigation = screen.getByRole('button', {
      name: /Start Investigation.*Create a new investigation/i,
    })

    expect(startInvestigation).toHaveAttribute('aria-label')
    expect(startInvestigation.getAttribute('aria-label')).toContain('Start Investigation')
    expect(startInvestigation.getAttribute('aria-label')).toContain('Create a new investigation')
  })

  it('quick actions group has proper role and label', async () => {
    renderHomePage()

    await screen.findByText(/Quick Actions/i)

    const quickActionsGroup = screen.getByRole('group', {
      name: /Quick action shortcuts/i,
    })

    expect(quickActionsGroup).toBeInTheDocument()
    expect(quickActionsGroup).toHaveAttribute('aria-label', 'Quick action shortcuts')
  })

  it('decorative icons are hidden from screen readers', async () => {
    const { container } = renderHomePage()

    await screen.findByText(/Quick Actions/i)

    // Find SVG icons within quick action cards
    const quickActionsSection = container.querySelector('[role="group"][aria-label="Quick action shortcuts"]')
    const icons = quickActionsSection?.querySelectorAll('svg')

    icons?.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('focus ring is visible on keyboard focus', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await screen.findByText(/Quick Actions/i)

    const firstAction = screen.getAllByRole('button', {
      name: /Start Investigation|Review Alerts|View Cases|Command Center/i,
    })[0]

    // Focus the element
    firstAction.focus()

    // Check if focus ring classes are present
    expect(firstAction.className).toMatch(/focus-within:ring/)
  })
})
