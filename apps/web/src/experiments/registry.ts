export type ExperimentLifecycle = 'draft' | 'active' | 'paused' | 'complete' | 'killed'
export type ExperimentReviewState = 'not-started' | 'in-review' | 'approved' | 'rejected'

export interface ExperimentDefinition {
  id: string
  name: string
  owner: string
  flagKey: string
  reviewState: ExperimentReviewState
  lifecycle: ExperimentLifecycle
  startsOn: string
  expiresOn: string
  learningGoals: string[]
  instrumentation: string[]
  dataAccess: 'read-only'
  navigationExposure: 'none'
}

export interface ExperimentalFlagRegistry {
  version: number
  updatedAt: string
  experiments: ExperimentDefinition[]
}

export const experimentalFlagRegistry: ExperimentalFlagRegistry = {
  version: 1,
  updatedAt: '2025-12-30T00:00:00Z',
  experiments: [
    {
      id: 'exp-velocity-shell',
      name: 'Experimental Shell Guardrails',
      owner: 'frontend-experimental-velocity',
      flagKey: 'exp_frontend_velocity_shell',
      reviewState: 'in-review',
      lifecycle: 'draft',
      startsOn: '2025-12-30',
      expiresOn: '2026-03-31',
      learningGoals: [
        'Validate experimental affordances without GA confusion',
        'Measure time-to-disable for emergency kills',
      ],
      instrumentation: ['exp.exposure', 'exp.kill_switch_used'],
      dataAccess: 'read-only',
      navigationExposure: 'none',
    },
    {
      id: 'exp-multi-pane-lab',
      name: 'Multi-Pane Lab Prototype',
      owner: 'frontend-experimental-velocity',
      flagKey: 'exp_multi_pane_lab',
      reviewState: 'not-started',
      lifecycle: 'draft',
      startsOn: '2025-12-30',
      expiresOn: '2026-03-31',
      learningGoals: [
        'Compare navigation comprehension vs GA baseline',
        'Validate preview banner clarity with analysts',
      ],
      instrumentation: ['exp.exposure', 'exp.feedback'],
      dataAccess: 'read-only',
      navigationExposure: 'none',
    },
  ],
}

export const experimentalFlagIndex = new Map(
  experimentalFlagRegistry.experiments.map(experiment => [experiment.id, experiment]),
)

export function getExperimentDefinition(id: string): ExperimentDefinition | undefined {
  return experimentalFlagIndex.get(id)
}

export function isExperimentExpired(experiment: ExperimentDefinition, now = new Date()): boolean {
  return new Date(experiment.expiresOn).getTime() < now.getTime()
}

export function validateExperimentalFlagRegistry(
  registry: ExperimentalFlagRegistry = experimentalFlagRegistry,
): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const flagKeys = new Set<string>()

  registry.experiments.forEach(experiment => {
    if (ids.has(experiment.id)) {
      errors.push(`Duplicate experiment id: ${experiment.id}`)
    }
    ids.add(experiment.id)

    if (flagKeys.has(experiment.flagKey)) {
      errors.push(`Duplicate flag key: ${experiment.flagKey}`)
    }
    flagKeys.add(experiment.flagKey)

    if (Number.isNaN(new Date(experiment.expiresOn).getTime())) {
      errors.push(`Invalid expiresOn for ${experiment.id}`)
    }
  })

  return errors
}
