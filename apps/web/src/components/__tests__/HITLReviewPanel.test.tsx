import { render, screen, fireEvent } from '@testing-library/react'
import { HITLReviewPanel } from '../HITLReviewPanel'
import { vi } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('HITLReviewPanel', () => {
  const mockData = { id: '123', content: 'test data' }
  const mockOnDecision = vi.fn()

  it('renders task and workflow details', () => {
    render(
      <HITLReviewPanel
        taskId="task-123"
        workflowId="workflow-456"
        data={mockData}
        onDecision={mockOnDecision}
      />
    )
    expect(screen.getByText(/task: task-123/i)).toBeInTheDocument()
    expect(screen.getByText(/workflow: workflow-456/i)).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <HITLReviewPanel
        taskId="task-123"
        workflowId="workflow-456"
        data={mockData}
        onDecision={mockOnDecision}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('handles decision selection and submission', () => {
    render(
      <HITLReviewPanel
        taskId="task-123"
        workflowId="workflow-456"
        data={mockData}
        onDecision={mockOnDecision}
      />
    )

    // Select 'Approve'
    // Target by label to prove accessibility
    const select = screen.getByLabelText(/decision/i)
    fireEvent.change(select, { target: { value: 'approved' } })

    const button = screen.getByRole('button', { name: /submit decision/i })
    expect(button).toBeEnabled()
    fireEvent.click(button)

    expect(mockOnDecision).toHaveBeenCalledWith('task-123', 'approved', '')
  })

  it('shows reason field when rejected is selected', () => {
    render(
      <HITLReviewPanel
        taskId="task-123"
        workflowId="workflow-456"
        data={mockData}
        onDecision={mockOnDecision}
      />
    )

    const select = screen.getByLabelText(/decision/i)
    fireEvent.change(select, { target: { value: 'rejected' } })

    expect(screen.getByLabelText(/reason for rejection/i)).toBeInTheDocument()
  })

  it('shows loading state when submitting', () => {
    render(
      <HITLReviewPanel
        taskId="task-123"
        workflowId="workflow-456"
        data={mockData}
        onDecision={mockOnDecision}
        isSubmitting={true}
      />
    )

    const button = screen.getByRole('button', { name: /submit decision/i })
    expect(button).toBeDisabled()
    // Button likely contains a spinner or loading text, check for disabled state is key
  })
})
