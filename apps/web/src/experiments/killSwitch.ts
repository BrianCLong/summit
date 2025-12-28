const KILL_SWITCH_STORAGE_KEY = 'experimentalKillSwitches'

export function getExperimentKillSwitches(storage: Storage = window.localStorage): string[] {
  try {
    const raw = storage.getItem(KILL_SWITCH_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to read experimental kill switches', error)
    return []
  }
}

export function setExperimentKillSwitch(
  experimentId: string,
  storage: Storage = window.localStorage,
): void {
  const existing = new Set(getExperimentKillSwitches(storage))
  existing.add(experimentId)
  storage.setItem(KILL_SWITCH_STORAGE_KEY, JSON.stringify([...existing]))
}

export function clearExperimentKillSwitch(
  experimentId: string,
  storage: Storage = window.localStorage,
): void {
  const existing = new Set(getExperimentKillSwitches(storage))
  existing.delete(experimentId)
  storage.setItem(KILL_SWITCH_STORAGE_KEY, JSON.stringify([...existing]))
}
