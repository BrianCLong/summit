import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

// Palantir-ish / Gotham-ish theme colors
const GOTHAM_THEME = {
  '--background': '#101113',
  '--foreground': '#c1c7cd',
  '--primary': '#3392fd',
  '--primary-foreground': '#ffffff',
  '--secondary': '#202226',
  '--secondary-foreground': '#ffffff',
  '--muted': '#2c3138',
  '--muted-foreground': '#878f96',
  '--accent': '#3392fd',
  '--accent-foreground': '#ffffff',
  '--destructive': '#d04444',
  '--destructive-foreground': '#ffffff',
  '--border': '#2c3138',
  '--input': '#202226',
  '--ring': '#3392fd',
  '--radius': '0px', // Gotham likes sharp edges
}

export function CoverStoryLayer() {
  const { coverStoryMode } = useSelector((state: RootState) => state.ui)

  useEffect(() => {
    if (coverStoryMode) {
      const root = document.documentElement
      const originalStyles: Record<string, string> = {}

      // Save original styles and apply Gotham
      Object.entries(GOTHAM_THEME).forEach(([key, value]) => {
        originalStyles[key] = root.style.getPropertyValue(key)
        root.style.setProperty(key, value)
      })

      // Add a class for specific overrides that CSS vars can't handle
      document.body.classList.add('gotham-mode')

      return () => {
        // Revert
        Object.entries(originalStyles).forEach(([key, value]) => {
          if (value) root.style.setProperty(key, value)
          else root.style.removeProperty(key)
        })
        document.body.classList.remove('gotham-mode')
      }
    }
  }, [coverStoryMode])

  return null
}
