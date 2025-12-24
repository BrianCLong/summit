import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLineageGraph } from './api'
import { primaryLineageFixture, restrictedLineageFixture } from './fixtures'

describe('fetchLineageGraph', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => primaryLineageFixture,
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns lineage graph for the given id', async () => {
    const result = await fetchLineageGraph(primaryLineageFixture.targetId)

    expect(fetchMock).toHaveBeenCalledWith('/api/lineage/evidence-123')
    expect(result.targetId).toBe(primaryLineageFixture.targetId)
    expect(result.upstream).toHaveLength(2)
    expect(result.downstream[0].label).toContain('Counterfeit')
  })

  it('preserves restriction flags from the API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => restrictedLineageFixture,
    })

    const result = await fetchLineageGraph('case-locked')

    expect(result.restricted).toBe(true)
    expect(result.upstream[0].restricted).toBe(true)
  })

  it('throws when the API call fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false })

    await expect(fetchLineageGraph('missing')).rejects.toThrow(
      /Unable to fetch lineage for missing/
    )
  })
})
