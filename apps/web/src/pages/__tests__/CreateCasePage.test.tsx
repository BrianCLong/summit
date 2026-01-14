import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreateCasePage from '@/pages/CreateCasePage'

describe('CreateCasePage', () => {
  it('renders the primary next-step action', () => {
    render(
      <MemoryRouter>
        <CreateCasePage />
      </MemoryRouter>
    )

    expect(screen.getByText('Create a Case')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Start from Investigations' })
    ).toBeInTheDocument()
  })
})
