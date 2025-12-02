import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { LineageExplorer } from './LineageExplorer'
import { WhyAmISeeingThis } from './WhyAmISeeingThis'
import { primaryLineageFixture, restrictedLineageFixture } from './fixtures'

const mockFetch = vi.fn()

describe('Lineage UI', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => primaryLineageFixture })
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders upstream and downstream chains in the explorer', async () => {
    render(<LineageExplorer entityId="evidence-123" initialGraph={primaryLineageFixture} />)

    const explorer = screen.getByLabelText('lineage-explorer')
    expect(explorer).toBeInTheDocument()
    expect(within(explorer).getByLabelText(/source/i)).toBeInTheDocument()
    expect(within(explorer).getByLabelText(/claim/i)).toBeInTheDocument()

    const policyTags = within(explorer).getByLabelText('policy-tags')
    expect(policyTags.textContent).toContain('PII')
    expect(policyTags.textContent).toContain('LICENSED')
  })

  it('embeds the why-am-i-seeing-this widget in multiple host contexts', () => {
    const GraphNodeHost = () => (
      <div data-testid="graph-node">
        <WhyAmISeeingThis entityId="evidence-123" initialGraph={primaryLineageFixture} />
      </div>
    )
    const EvidenceListHost = () => (
      <div data-testid="evidence-row">
        <WhyAmISeeingThis entityId="evidence-123" initialGraph={primaryLineageFixture} />
      </div>
    )

    render(
      <div>
        <GraphNodeHost />
        <EvidenceListHost />
      </div>
    )

    const graphWidget = within(screen.getByTestId('graph-node')).getByLabelText('why-am-i-seeing-this')
    const evidenceWidget = within(screen.getByTestId('evidence-row')).getByLabelText('why-am-i-seeing-this')

    expect(graphWidget).toBeInTheDocument()
    expect(evidenceWidget).toBeInTheDocument()
    expect(within(graphWidget).getByTestId('upstream-summary').textContent).toContain('S3 Intake')
  })

  it('shows restriction messaging without leaking details', () => {
    render(
      <WhyAmISeeingThis
        entityId="case-locked"
        initialGraph={restrictedLineageFixture}
        contextLabel="Case workspace"
      />
    )

    expect(screen.getByText(/warrant-based clearance/i)).toBeInTheDocument()
    expect(screen.queryByTestId('upstream-summary')).not.toBeInTheDocument()
    expect(screen.getByLabelText('policy-tags-inline').textContent).toContain('WARRANT_ONLY')
  })

  it('bubbles view details when available', () => {
    const onViewDetails = vi.fn()
    render(
      <WhyAmISeeingThis
        entityId="evidence-123"
        initialGraph={primaryLineageFixture}
        onViewDetails={onViewDetails}
      />
    )

    fireEvent.click(screen.getByText('View lineage'))
    expect(onViewDetails).toHaveBeenCalledWith(primaryLineageFixture)
  })
})
