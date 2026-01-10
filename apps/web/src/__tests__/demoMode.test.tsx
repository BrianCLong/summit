import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { DemoIndicator } from '@/components/common/DemoIndicator'
import { DemoModeGate } from '@/components/common/DemoModeGate'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('demo mode gating', () => {
  it('prevents access to demo routes when the flag is disabled', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')

    render(
      <MemoryRouter initialEntries={[{ pathname: '/demo' }]}> 
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route
            path="/demo"
            element={
              <DemoModeGate>
                <div>demo control</div>
              </DemoModeGate>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByText('demo control')).not.toBeInTheDocument()
  })

  it('shows the demo banner when the flag is enabled', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')

    render(<DemoIndicator />)

    expect(screen.getByText(/demo mode/i)).toBeInTheDocument()
  })
})
