import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FliaReportView } from '../FliaReport'
import { sampleReport } from '../sampleData'

describe('FliaReportView', () => {
  it('renders the change headline and impacted models', () => {
    render(<FliaReportView report={sampleReport} />)

    expect(screen.getByText('Feature Lineage Impact Report')).toBeInTheDocument()
    expect(screen.getByText(/feature:user_profile.email_domain/)).toBeInTheDocument()

    const modelsSection = screen.getByRole('region', { name: 'Impacted models' })
    const modelItems = within(modelsSection).getAllByRole('listitem')
    expect(modelItems.length).toBeGreaterThan(0)
    expect(modelItems[0].textContent).toContain('model:churn_predictor')
  })

  it('shows playbook action details', () => {
    render(<FliaReportView report={sampleReport} />)

    const playbookSection = screen.getByRole('region', { name: 'Change playbook' })
    expect(within(playbookSection).getByText('Tests')).toBeInTheDocument()
    expect(
      within(playbookSection).getByText('Feature contract coverage for user_profile.email_domain')
    ).toBeInTheDocument()
  })
})
