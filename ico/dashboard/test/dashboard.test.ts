import { describe, expect, it } from 'vitest'
import { buildDashboardState, computeUtilizationForecast, PlanDocument } from '../src/index.js'
import { readFileSync } from 'node:fs'

const fixture: PlanDocument = JSON.parse(
  readFileSync(new URL('../../controller/planfixtures/plan.json', import.meta.url), 'utf8'),
)

describe('ICO dashboard state', () => {
  it('summarises planner output deterministically', () => {
    const state = buildDashboardState(fixture)
    expect(state.totals.savingsPct).toBeCloseTo(0.566, 3)
    expect(state.endpoints).toHaveLength(2)
    const [first] = state.endpoints
    expect(first.quantizationStrategy).toBe('int8')
    expect(first.savingsPct).toBeGreaterThan(0.5)
  })

  it('builds utilization forecast for multiple load levels', () => {
    const points = computeUtilizationForecast(fixture, [0.5, 1, 1.5])
    expect(points).toHaveLength(3)
    expect(points[0].label).toBe('50% load')
    expect(points[2].value).toBeCloseTo(150, 1)
  })
})

