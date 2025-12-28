import { getExperimentKillSwitches } from './killSwitch'
import {
  getExperimentDefinition,
  isExperimentExpired,
  validateExperimentalFlagRegistry,
} from './registry'

export type ExperimentDecisionReason =
  | 'enabled'
  | 'disabled'
  | 'expired'
  | 'missing-definition'
  | 'kill-switch'

export interface ExperimentDecision {
  enabled: boolean
  reason: ExperimentDecisionReason
}

export function evaluateExperiment(
  experimentId: string,
  isFlagEnabled: (flagKey: string, defaultValue?: boolean) => boolean,
  storage: Storage = window.localStorage,
  now = new Date(),
): ExperimentDecision {
  const experiment = getExperimentDefinition(experimentId)
  if (!experiment) {
    return { enabled: false, reason: 'missing-definition' }
  }

  if (isExperimentExpired(experiment, now)) {
    return { enabled: false, reason: 'expired' }
  }

  if (getExperimentKillSwitches(storage).includes(experimentId)) {
    return { enabled: false, reason: 'kill-switch' }
  }

  const enabled = isFlagEnabled(experiment.flagKey, false)
  return { enabled, reason: enabled ? 'enabled' : 'disabled' }
}

export function warnOnInvalidExperimentalRegistry(): void {
  const errors = validateExperimentalFlagRegistry()
  if (errors.length > 0) {
    console.warn('Experimental flag registry validation failed', errors)
  }
}
