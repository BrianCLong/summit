import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CasesPage from '@/pages/CasesPage'

vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChange, placeholder, className }: any) => (
    <input
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={event => onChange?.(event.target.value)}
    />
  ),
}))

describe('CasesPage', () => {
  it('shows empty state quick actions when filters remove all cases', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText(
      'Search cases by title, description, or tags...'
    )

    await user.type(searchInput, 'no-matching-cases')

    expect(await screen.findByText('No cases found')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create a case' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review alerts' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Explore investigations' })
    ).toBeInTheDocument()
  })
})
