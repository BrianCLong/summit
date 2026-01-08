import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DemoModeGate } from '../components/common/DemoModeGate'
import * as demoModeLib from '../lib/demoMode'

// Mock the demo mode hook
vi.mock('../lib/demoMode', () => ({
  isDemoModeEnabled: vi.fn(),
  useDemoMode: vi.fn(),
}))

describe('Critical Flows - Demo Gating', () => {
  it('should render children when demo mode is enabled', () => {
    // @ts-ignore
    demoModeLib.isDemoModeEnabled.mockReturnValue(true)
    // @ts-ignore
    demoModeLib.useDemoMode.mockReturnValue(true)

    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route
            path="/demo"
            element={
              <DemoModeGate>
                <div>Demo Content</div>
              </DemoModeGate>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Demo Content')).toBeInTheDocument()
  })

  it('should redirect or not render when demo mode is disabled', () => {
    // @ts-ignore
    demoModeLib.isDemoModeEnabled.mockReturnValue(false)
    // @ts-ignore
    demoModeLib.useDemoMode.mockReturnValue(false)

    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route
            path="/demo"
            element={
              <DemoModeGate>
                <div>Demo Content</div>
              </DemoModeGate>
            }
          />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    // DemoModeGate usually redirects or returns null.
    // Assuming implementation details:
    expect(screen.queryByText('Demo Content')).not.toBeInTheDocument()
  })
})
