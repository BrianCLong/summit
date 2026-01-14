import { describe, it, beforeEach, expect, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@/test-utils'
import SetupPage from '@/pages/SetupPage'
import { setMilestoneStatus } from '@/lib/firstRunFunnel'

const setupRender = () =>
  render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    )
  })

  it('renders the setup checklist and continue link', () => {
    setupRender()

    expect(screen.getByText('Setup checklist')).toBeInTheDocument()
    expect(screen.getByText('Connect a data source')).toBeInTheDocument()
    expect(screen.getByText('Start an investigation')).toBeInTheDocument()

    const continueLink = screen.getByRole('link', { name: /continue setup/i })
    expect(continueLink).toHaveAttribute('href', '/data/sources')
  })

  it('moves the continue link to the next milestone', () => {
    setMilestoneStatus('connect_data_source', 'complete')

    setupRender()

    const continueLink = screen.getByRole('link', { name: /continue setup/i })
    expect(continueLink).toHaveAttribute('href', '/explore')
  })
})
