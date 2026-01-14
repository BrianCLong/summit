import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' } }),
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => false,
}))

describe('HomePage', () => {
  it('shows quick actions in the empty metrics state', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No live metrics')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Connect data source' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review alerts' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Start investigation' })
    ).toBeInTheDocument()
  })
})
