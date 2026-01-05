
import React from 'react'
import { render, screen } from '@testing-library/react'
import { GlobalSearch } from '../GlobalSearch'
import { SearchProvider } from '@/contexts/SearchContext'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock useSearch to control the state
const mockSearchContext = {
  isOpen: true,
  query: '',
  setQuery: vi.fn(),
  openSearch: vi.fn(),
  closeSearch: vi.fn(),
  results: [],
  setResults: vi.fn(),
  loading: false,
  setLoading: vi.fn(),
}

// Better approach: Mock the module
vi.mock('@/contexts/SearchContext', () => ({
  useSearch: () => mockSearchContext,
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => true,
}))

describe('GlobalSearch', () => {
  it('renders search input with accessible label', () => {
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    )

    // Verify the input has the accessible name "Global Search"
    // Note: CMDK uses aria-labelledby on the input pointing to the label we provided to the Command component
    // This takes precedence over aria-label on the input itself.
    const input = screen.getByRole('combobox', { name: 'Global Search' })
    expect(input).toBeInTheDocument()

    // Verify the Command root has the label "Global Search" text visible/present in DOM (even if sr-only)
    const commandLabel = screen.getByText('Global Search')
    expect(commandLabel).toBeInTheDocument()
  })
})
