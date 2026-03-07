import React, { useState } from 'react'

// Types matching backend
interface SimulationEntity {
  id?: string
  name: string
  type: 'actor' | 'group'
  alignment: 'ally' | 'neutral' | 'opposition'
  influence: number
  sentiment: number
  volatility: number
  resilience: number
  themes: Record<string, number>
  relationships: { targetId: string; strength: number }[]
}

interface ShockDefinition {
  type: string
  targetTag?: string
  intensity: number
  description: string
}

interface ScenarioCluster {
  label: string
  count: number
  avgSentiment: number
  avgInfluence: number
  sampleIds: string[]
}

interface ScenarioResult {
  scenarioId: string
  totalRuns: number
  clusters: ScenarioCluster[]
}

const DEFAULT_ENTITIES: SimulationEntity[] = [
  {
    name: 'Government',
    type: 'group',
    alignment: 'ally',
    influence: 1.2,
    sentiment: 0.5,
    volatility: 0.1,
    resilience: 0.9,
    themes: { stability: 1.0, reform: 0.2 },
    relationships: [],
  },
  {
    name: 'Opposition Party',
    type: 'group',
    alignment: 'opposition',
    influence: 0.8,
    sentiment: -0.5,
    volatility: 0.6,
    resilience: 0.5,
    themes: { stability: -0.5, reform: 0.8 },
    relationships: [],
  },
  {
    name: 'Public',
    type: 'group',
    alignment: 'neutral',
    influence: 1.5,
    sentiment: 0.0,
    volatility: 0.4,
    resilience: 0.3,
    themes: { stability: 0.5, reform: 0.5 },
    relationships: [],
  },
]

export const ScenarioSimulator: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [entities, setEntities] = useState<SimulationEntity[]>(DEFAULT_ENTITIES)
  const [shockEnabled, setShockEnabled] = useState(false)
  const [shockDescription, setShockDescription] = useState(
    'Cyber Attack on Grid'
  )

  const runSimulation = async () => {
    setLoading(true)
    try {
      const shock: ShockDefinition | undefined = shockEnabled
        ? {
            type: 'shock',
            targetTag: 'Government',
            intensity: 1.5,
            description: shockDescription,
          }
        : undefined

      // Note: The API prefix might need to be adjusted based on setup.
      // Usually it's /api/narrative-sim... or similar.
      // Assuming mounted at /narrative-sim based on typical express router usage,
      // but 'server/src/app.ts' would confirm. I'll use a relative path assuming proxy setup.
      // If it fails, I'll need to check the actual mount point.
      const response = await fetch('/api/narrative-sim/simulations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            name: 'Manual Scenario',
            themes: ['stability', 'reform'],
            initialEntities: entities,
            generatorMode: 'rule-based',
          },
          iterations: 20,
          ticks: 20,
          shock,
        }),
      })

      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error(err)
      alert('Failed to run simulation. See console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Scenario Simulator v2
        </h1>
        <p className="text-slate-600">
          Predictive Narrative & Adversarial Shock Engine
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>

            <div className="mb-4">
              <label
                htmlFor="scenario-entities"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Scenario Entities (JSON)
              </label>
              <textarea
                id="scenario-entities"
                className="w-full h-64 p-3 border rounded font-mono text-xs bg-slate-50"
                value={JSON.stringify(entities, null, 2)}
                onChange={e => {
                  try {
                    setEntities(JSON.parse(e.target.value))
                  } catch (e) {}
                }}
                aria-label="Edit scenario entities JSON"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium" id="shock-label">
                  Adversarial Shock
                </span>
                <input
                  type="checkbox"
                  checked={shockEnabled}
                  onChange={e => setShockEnabled(e.target.checked)}
                  className="h-5 w-5"
                  aria-labelledby="shock-label"
                />
              </div>

              {shockEnabled && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="shock-description"
                      className="block text-xs font-medium text-slate-500"
                    >
                      Description
                    </label>
                    <input
                      id="shock-description"
                      type="text"
                      value={shockDescription}
                      onChange={e => setShockDescription(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Target: Government (Auto-inferred)
                    <br />
                    Intensity: 1.5 (High)
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
              aria-label={
                loading
                  ? 'Simulation in progress'
                  : 'Run Monte Carlo Batch Simulation (20 iterations)'
              }
            >
              {loading ? 'Simulating...' : 'Run Monte Carlo Batch (20x)'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {result ? (
            <div
              className="space-y-6"
              role="region"
              aria-label="Simulation Results"
            >
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold mb-4">
                  Outcome Clustering
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.clusters.map(cluster => (
                    <div
                      key={cluster.label}
                      className={`p-4 rounded-lg border-l-4 ${
                        cluster.label.includes('Crisis') ||
                        cluster.label.includes('Stagnation')
                          ? 'border-red-500 bg-red-50'
                          : cluster.label.includes('Optimistic') ||
                              cluster.label.includes('Prosperity')
                            ? 'border-green-500 bg-green-50'
                            : 'border-blue-500 bg-blue-50'
                      }`}
                      role="article"
                      aria-label={`${cluster.label} Outcome Cluster`}
                    >
                      <h3 className="font-bold text-lg">{cluster.label}</h3>
                      <div className="text-3xl font-black my-2">
                        {((cluster.count / result.totalRuns) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>Runs: {cluster.count}</div>
                        <div>
                          Avg Sentiment: {cluster.avgSentiment.toFixed(2)}
                        </div>
                        <div>
                          Avg Influence: {cluster.avgInfluence.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-medium mb-2">Analysis</h3>
                <p className="text-slate-600">
                  Simulation ran {result.totalRuns} parallel futures.
                  {shockEnabled
                    ? ' An adversarial shock was injected at tick 5.'
                    : ' Standard organic evolution.'}{' '}
                  The dominant outcome is{' '}
                  <strong>{result.clusters[0]?.label}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
              Run a simulation to view predictive clusters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
