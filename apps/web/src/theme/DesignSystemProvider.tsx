/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react'

import { designTokenEntries } from './tokens'
import { isFeatureEnabled } from '@/config'

type DesignSystemProviderProps = {
  children: React.ReactNode
  /**
   * Force tokens on for environments (like Storybook) where env flags
   * are not wired.
   */
  enableTokens?: boolean
  tokenOverrides?: Record<string, string | number>
}

const hasDom = () => typeof document !== 'undefined'

export const applyTokenVariables = (
  root: HTMLElement,
  entries = designTokenEntries,
  overrides: Record<string, string | number> = {}
) => {
  entries.forEach(([name, value]) =>
    root.style.setProperty(`--${name}`, String(value))
  )
  Object.entries(overrides).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, String(value))
  })
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  enableTokens,
  tokenOverrides,
}) => {
  const shouldEnable = enableTokens ?? isFeatureEnabled('ui.tokensV1')

  React.useEffect(() => {
    if (!hasDom() || !shouldEnable) {
      return
    }

    const root = document.documentElement
    const previousFlag = root.dataset.uiTokens
    const previousValues = new Map<string, string>()

    const overrideEntries = Object.entries(tokenOverrides ?? {})
    const allEntries = [...designTokenEntries, ...overrideEntries]

    allEntries.forEach(([name]) => {
      const cssName = `--${name}`
      previousValues.set(cssName, root.style.getPropertyValue(cssName))
    })

    applyTokenVariables(root, designTokenEntries, tokenOverrides)
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
  }, [shouldEnable, tokenOverrides])

  return <>{children}</>
}
