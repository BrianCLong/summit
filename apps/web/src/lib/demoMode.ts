import React from 'react'

export const isDemoModeEnabled = (): boolean => {
  const flag = import.meta.env.VITE_DEMO_MODE
  if (!flag) {
    return false
  }

  return flag === '1' || flag.toLowerCase() === 'true'
}

export const useDemoMode = (): boolean =>
  React.useMemo(() => isDemoModeEnabled(), [])
