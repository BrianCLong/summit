import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PRTriagePage } from '../PRTriagePage'
import { KeyboardShortcutsProvider } from '@/contexts/KeyboardShortcutsContext'

// window.open is not defined in jsdom
vi.stubGlobal('open', vi.fn())

const renderPage = () =>
  render(
    <KeyboardShortcutsProvider>
      <PRTriagePage />
    </KeyboardShortcutsProvider>
  )

// Helper: wait until at least one element matching text is in the document
const waitForText = (text: RegExp | string) =>
  waitFor(() => {
    const elements = screen.getAllByText(text)
    expect(elements.length).toBeGreaterThan(0)
  })

describe('PRTriagePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the tri-pane layout', async () => {
    renderPage()
    expect(screen.getByText('PR Triage Workspace')).toBeInTheDocument()
    expect(screen.getByText('PR Queue')).toBeInTheDocument()
    expect(screen.getByText('Diff Preview')).toBeInTheDocument()
    expect(screen.getByText('Risk & Actions')).toBeInTheDocument()
  })

  it('renders status bucket filter pills', () => {
    renderPage()
    expect(screen.getByText(/Merge Ready/i)).toBeInTheDocument()
    expect(screen.getByText(/Conflict/i)).toBeInTheDocument()
    expect(screen.getByText(/Needs Review/i)).toBeInTheDocument()
    expect(screen.getByText(/Governance Block/i)).toBeInTheDocument()
  })

  it('renders priority and assignee filter controls', () => {
    renderPage()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument()
  })

  it('shows mock PRs in the queue after loading', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)
    expect(screen.getAllByText(/branch convergence metrics/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/governance-conflict/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/PR triage workspace/i).length).toBeGreaterThan(0)
  })

  it('selects a PR and shows diff preview on click', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    // The first PR row button should be auto-selected; click a second one
    const conflictRow = screen.getAllByRole('button', { pressed: false })[0]
    fireEvent.click(conflictRow)

    // After clicking, the branch convergence section should appear in diff preview
    await waitFor(() => {
      expect(screen.getAllByText(/Branch Convergence/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays risk checklist for the active PR', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    // Risk Checklist section should be visible for the auto-selected first PR
    expect(screen.getAllByText(/Risk Checklist/i).length).toBeGreaterThan(0)
  })

  it('shows "pass" / "fail" badges in the risk checklist', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/Risk Checklist/i).length).toBeGreaterThan(0)
    })
    const passBadges = screen.getAllByText('pass')
    expect(passBadges.length).toBeGreaterThan(0)
  })

  it('filters by status bucket', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    // Click "Conflict" bucket pill
    const conflictPill = screen.getByRole('button', { name: /Conflict \(\d+\)/i })
    fireEvent.click(conflictPill)

    await waitFor(() => {
      // The conflict PR should still be visible
      expect(screen.getAllByText(/governance-conflict/i).length).toBeGreaterThan(0)
      // The merge-ready PR should no longer be in the queue
      expect(screen.queryAllByText(/branch convergence metrics/i)).toHaveLength(0)
    })
  })

  it('filters by priority', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    const prioritySelect = screen.getByLabelText('Priority')
    fireEvent.change(prioritySelect, { target: { value: 'low' } })

    await waitFor(() => {
      // Only the docs PR is low priority
      expect(screen.getByText(/triage-runbook/i)).toBeInTheDocument()
      expect(screen.queryAllByText(/branch convergence metrics/i)).toHaveLength(0)
    })
  })

  it('shows branch convergence info in diff preview', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    // Click the merge-ready PR (PR #101)
    const prRow = screen.getAllByText(/branch convergence metrics/i)[0].closest('button')
    if (prRow) fireEvent.click(prRow)

    await waitFor(() => {
      expect(screen.getByText(/Merges cleanly against main/i)).toBeInTheDocument()
    })
  })

  it('shows conflict status in branch convergence for conflict PRs', async () => {
    renderPage()
    await waitForText(/governance-conflict/i)

    // Click the conflict PR row (branch name contains governance-conflict)
    const conflictRow = screen.getAllByText(/governance-conflict/i)[0].closest('button')
    if (conflictRow) fireEvent.click(conflictRow)

    await waitFor(() => {
      expect(screen.getByText(/Merge conflict against main/i)).toBeInTheDocument()
    })
  })

  it('renders collapsed diff files that expand on click', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    // PR #101 diff: apps/api/src/routes/convergence.ts should be expandable
    // First file auto-expands; clicking the second should expand it
    const secondFile = screen.getByText('apps/api/src/routes/convergence.test.ts')
    expect(secondFile).toBeInTheDocument()
    fireEvent.click(secondFile.closest('button')!)

    await waitFor(() => {
      // After expanding, the patch content is rendered
      expect(screen.getAllByText(/\+const new_/i).length).toBeGreaterThan(0)
    })
  })

  it('has Quick Assign input and Assign button', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)
    expect(screen.getByLabelText('Quick Assign')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument()
  })

  it('shows approve / request-changes / defer action buttons', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /defer/i })).toBeInTheDocument()
  })

  it('reset button restores mock data', async () => {
    renderPage()
    await waitForText(/branch convergence metrics/i)

    const resetBtn = screen.getByLabelText('Reset PR queue')
    fireEvent.click(resetBtn)

    await waitForText(/branch convergence metrics/i)
  })
})
