import React from 'react'
import { render, screen } from '@testing-library/react'
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp'
import { vi } from 'vitest'

// Mock the context hook
const { mockUseKeyboardShortcuts } = vi.hoisted(() => {
  return {
    mockUseKeyboardShortcuts: vi.fn(),
  }
})

vi.mock('@/contexts/KeyboardShortcutsContext', () => ({
  useKeyboardShortcuts: mockUseKeyboardShortcuts,
}))

// Mock UI components to avoid Radix UI issues in test environment
vi.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div role="heading">{children}</div>
  ),
}))

describe('KeyboardShortcutsHelp', () => {
  beforeEach(() => {
    mockUseKeyboardShortcuts.mockReturnValue({
      isHelpOpen: true,
      closeHelp: vi.fn(),
      shortcuts: [
        {
          id: 'test-shortcut-1',
          keys: ['mod+k'],
          description: 'Open Command Palette',
          category: 'Navigation',
          action: vi.fn(),
        },
        {
          id: 'test-shortcut-2',
          keys: ['shift+?'],
          description: 'Show Help',
          category: 'General',
          action: vi.fn(),
        },
      ],
    })
  })

  it('renders help dialog with shortcuts', () => {
    render(<KeyboardShortcutsHelp />)

    // Check if the dialog title is present
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()

    // Check if the shortcuts are rendered
    expect(screen.getByText('Open Command Palette')).toBeInTheDocument()
    expect(screen.getByText('Show Help')).toBeInTheDocument()
  })

  it('renders accessible labels for key badges', () => {
    render(<KeyboardShortcutsHelp />)

    // Initially, these should fail because aria-labels are missing
    const commandBadges = screen.getAllByLabelText('Command')
    expect(commandBadges.length).toBeGreaterThan(0)

    const shiftBadges = screen.getAllByLabelText('Shift')
    expect(shiftBadges.length).toBeGreaterThan(0)
  })

  it('renders accessible labels for footer badges', () => {
    render(<KeyboardShortcutsHelp />)

    // Footer has '?' badge
    const questionMarkBadge = screen.getByLabelText('Question mark')
    expect(questionMarkBadge).toBeInTheDocument()

    // Footer has 'K' badge
    const kBadge = screen.getByLabelText('K')
    expect(kBadge).toBeInTheDocument()
  })
})
