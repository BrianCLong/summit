// @ts-nocheck
import React from 'react'

import { designTokenEntries, tokenVariables } from './tokens'
import { isFeatureEnabled } from '@/config'

type DesignSystemProviderProps = {
  children: React.ReactNode
  /**
   * Force tokens on for environments (like Storybook) where env flags
   * are not wired.
   */
  enableTokens?: boolean
}

const hasDom = () => typeof document !== 'undefined'

export const applyTokenVariables = (
  root: HTMLElement,
  entries = designTokenEntries
) => {
  entries.forEach(([name, value]) =>
    root.style.setProperty(`--${name}`, String(value))
  )
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  enableTokens,
}) => {
  const shouldEnable = enableTokens ?? isFeatureEnabled('ui.tokensV1')

  React.useEffect(() => {
    if (!hasDom() || !shouldEnable) {
      return
    }

    const root = document.documentElement
    const previousFlag = root.dataset.uiTokens
    const previousValues = new Map<string, string>()

    Object.entries(tokenVariables).forEach(([name]) => {
      const cssName = `--${name}`
      previousValues.set(cssName, root.style.getPropertyValue(cssName))
    })

    applyTokenVariables(root)
    root.dataset.uiTokens = 'v1'

    return () => {
      if (previousFlag) {
        root.dataset.uiTokens = previousFlag
      } else {
        delete root.dataset.uiTokens
      }

      previousValues.forEach((value, key) => {
        if (value) {
          root.style.setProperty(key, value)
        } else {
          root.style.removeProperty(key)
        }
      })
    }
  }, [shouldEnable])

  return <>{children}</>
}
