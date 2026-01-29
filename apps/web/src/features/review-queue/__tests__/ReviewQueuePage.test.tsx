import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ReviewQueuePage } from '../ReviewQueuePage'
import { KeyboardShortcutsProvider } from '@/contexts/KeyboardShortcutsContext'

const renderPage = () =>
  render(
    <KeyboardShortcutsProvider>
      <ReviewQueuePage />
    </KeyboardShortcutsProvider>
  )

describe('ReviewQueuePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders tri-pane layout with filters, preview, and actions', () => {
    renderPage()

    expect(screen.getByText('Review Queue')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it.skip('approves an item and removes it from the open queue', async () => {
    renderPage()

    const targetTitle = 'Evidence snippet: anomalous fund transfer'
    const item = await screen.findByText(targetTitle)
    fireEvent.click(item)

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => {
      expect(screen.queryByText(targetTitle)).not.toBeInTheDocument()
    })
  })
})
