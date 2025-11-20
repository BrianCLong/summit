// =============================================
// Screen Reader Announcer Hook for A11y
// =============================================
import { useEffect, useRef, useCallback } from 'react'

type AnnouncerPriority = 'polite' | 'assertive'

/**
 * Hook to create a screen reader announcer for dynamic content updates
 * @returns announce function to send messages to screen readers
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create announcer elements if they don't exist
    if (!document.getElementById('a11y-announcer-polite')) {
      const politeAnnouncer = document.createElement('div')
      politeAnnouncer.id = 'a11y-announcer-polite'
      politeAnnouncer.className = 'sr-only'
      politeAnnouncer.setAttribute('aria-live', 'polite')
      politeAnnouncer.setAttribute('aria-atomic', 'true')
      document.body.appendChild(politeAnnouncer)
    }

    if (!document.getElementById('a11y-announcer-assertive')) {
      const assertiveAnnouncer = document.createElement('div')
      assertiveAnnouncer.id = 'a11y-announcer-assertive'
      assertiveAnnouncer.className = 'sr-only'
      assertiveAnnouncer.setAttribute('aria-live', 'assertive')
      assertiveAnnouncer.setAttribute('aria-atomic', 'true')
      document.body.appendChild(assertiveAnnouncer)
    }

    return () => {
      // Cleanup on unmount (only if no other components are using it)
      // We don't remove the announcers to allow multiple components to use them
    }
  }, [])

  const announce = useCallback(
    (message: string, priority: AnnouncerPriority = 'polite') => {
      const announcerId = `a11y-announcer-${priority}`
      const announcer = document.getElementById(announcerId)

      if (announcer) {
        // Clear previous message
        announcer.textContent = ''

        // Set new message after a brief delay to ensure screen readers detect the change
        setTimeout(() => {
          announcer.textContent = message
        }, 100)

        // Clear message after it's been announced
        setTimeout(() => {
          announcer.textContent = ''
        }, 3000)
      }
    },
    []
  )

  return { announce }
}
