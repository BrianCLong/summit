
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalSearch } from '../GlobalSearch'
import * as SearchContext from '@/contexts/SearchContext'
import * as DemoIndicator from '@/components/common/DemoIndicator'
import { BrowserRouter } from 'react-router-dom'

// Mock dependencies
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="icon-search" />,
  FileText: () => <div data-testid="icon-filetext" />,
  User: () => <div data-testid="icon-user" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  Zap: () => <div data-testid="icon-zap" />,
  Loader2: () => <div data-testid="icon-loader" />,
  X: () => <div data-testid="icon-x" />,
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, onClick }: any) => <div data-testid="badge" onClick={onClick}>{children}</div>
}))

// Mock cmdk to avoid complex DOM structures in unit tests
// This is often necessary because cmdk relies on ResizeObserver and other browser APIs
// But for this test, let's try to test the Logic mainly.
// Actually, `cmdk` is a React component, so we can render it.
// However, we need to mock `useNavigate`
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('GlobalSearch', () => {
  const setQuery = vi.fn()
  const closeSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default context mock
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: true,
      query: '',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })

    vi.spyOn(DemoIndicator, 'useDemoMode').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when closed', () => {
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: false,
      query: '',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })
    const { container } = render(<GlobalSearch />, { wrapper: BrowserRouter })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders search input when open', () => {
    render(<GlobalSearch />, { wrapper: BrowserRouter })
    expect(screen.getByLabelText('Global search')).toBeInTheDocument()
  })

  it('shows loading state when typing', async () => {
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: true,
      query: 'test',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })

    render(<GlobalSearch />, { wrapper: BrowserRouter })

    // Initially we might see loading or results depending on effect timing
    // The effect sets loading=true immediately when query exists
    await waitFor(() => {
       expect(screen.getByText('Searching...')).toBeInTheDocument()
    })
  })

  it('shows empty state when no results found', async () => {
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: true,
      query: 'nonexistentquery12345',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })

    render(<GlobalSearch />, { wrapper: BrowserRouter })

    // Wait for debounce and search execution
    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('shows suggestions when query is empty', () => {
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: true,
      query: '',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })

    render(<GlobalSearch />, { wrapper: BrowserRouter })
    expect(screen.getByText('SUGGESTED SEARCHES')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
  })

  it('clicking a suggestion sets the query', () => {
    vi.spyOn(SearchContext, 'useSearch').mockReturnValue({
      isOpen: true,
      query: '',
      setQuery,
      closeSearch,
      openSearch: vi.fn(),
      toggleSearch: vi.fn()
    })

    render(<GlobalSearch />, { wrapper: BrowserRouter })
    fireEvent.click(screen.getByText('Network'))
    expect(setQuery).toHaveBeenCalledWith('Network')
  })
})
