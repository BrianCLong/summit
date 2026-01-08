import { render, screen } from '@testing-library/react'
import StrategyWall from './StrategyWall'
import { describe, it, expect } from 'vitest'
import React from 'react'

describe('StrategyWall', () => {
  it('renders loading state', () => {
    render(<StrategyWall plan={null} loading={true} />)
    expect(screen.getByText('Loading Strategy Wall...')).toBeInTheDocument()
  })

  it('renders plan data', () => {
    const mockPlan = {
      objectives: [
        { id: '1', name: 'Test Obj', status: 'ON_TRACK', progress: 50 },
      ],
      initiatives: [{ id: '2', name: 'Test Init', status: 'IN_PROGRESS' }],
      kpis: [{ id: '3', name: 'Test KPI', currentValue: 10, unit: '%' }],
    }
    render(<StrategyWall plan={mockPlan} loading={false} />)
    expect(screen.getByText('Test Obj')).toBeInTheDocument()
    expect(screen.getByText('Test Init')).toBeInTheDocument()
    expect(screen.getByText('Test KPI')).toBeInTheDocument()
  })
})
