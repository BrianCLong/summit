import { useFeatureFlags } from '../contexts/FeatureFlagContext'

export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(key, defaultValue)
}

export function useFeatureVariant<T>(key: string, defaultValue: T): T {
  const { getVariant } = useFeatureFlags()
  return getVariant<T>(key, defaultValue)
}
