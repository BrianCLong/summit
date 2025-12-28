import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const renderDemoIndicator = async (value: string) => {
  vi.resetModules()
  vi.stubEnv('VITE_DEMO_MODE', value)
  const { DemoIndicator } = await import('../DemoIndicator')
  render(<DemoIndicator />)
}

describe('DemoIndicator', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('renders explicit demo copy when enabled', async () => {
    await renderDemoIndicator('true')

    expect(
      screen.getByText(
        /DEMO MODE - Data shown is for demonstration purposes only/i
      )
    ).toBeInTheDocument()
  })
})
