import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ForecastingView } from '../ForecastingView'

const forecastFixture = [
  {
    forecast_date: '2025-12-01T00:00:00Z',
    predicted_value: 42,
    confidence_interval_lower: 38,
    confidence_interval_upper: 45,
  },
]

describe('ForecastingView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(forecastFixture),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('labels forecasted data as modeled', async () => {
    render(<ForecastingView kpiId="latency" />)

    await waitFor(() => {
      expect(screen.getByText('Modeled forecast')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'Forecast values are modeled estimates, not observed metrics.'
      )
    ).toBeInTheDocument()
  })
})
