// =============================================
// Accessibility Utilities
// =============================================

/**
 * Generate a unique ID for accessibility attributes
 * @param prefix Prefix for the ID
 * @returns Unique ID string
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if an element is focusable
 * @param element HTML element to check
 * @returns boolean indicating if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
  ]

  return focusableSelectors.some((selector) => element.matches(selector))
}

/**
 * Get all focusable elements within a container
 * @param container Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
  ]

  const elements = container.querySelectorAll(focusableSelectors.join(','))
  return Array.from(elements) as HTMLElement[]
}

/**
 * Trap focus within a container element
 * @param container Container element
 * @param event Keyboard event
 */
export function handleFocusTrap(
  container: HTMLElement,
  event: KeyboardEvent
): void {
  if (event.key !== 'Tab') return

  const focusableElements = getFocusableElements(container)
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement?.focus()
      event.preventDefault()
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      firstElement?.focus()
      event.preventDefault()
    }
  }
}

/**
 * Create a visually hidden element for screen readers
 * @param text Text content for screen readers
 * @returns HTML element
 */
export function createScreenReaderOnly(text: string): HTMLSpanElement {
  const element = document.createElement('span')
  element.className = 'sr-only'
  element.textContent = text
  return element
}

/**
 * Announce a message to screen readers
 * @param message Message to announce
 * @param priority Priority level ('polite' or 'assertive')
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcerId = `a11y-announcer-${priority}`
  let announcer = document.getElementById(announcerId)

  if (!announcer) {
    announcer = document.createElement('div')
    announcer.id = announcerId
    announcer.className = 'sr-only'
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    document.body.appendChild(announcer)
  }

  // Clear previous message
  announcer.textContent = ''

  // Set new message after a brief delay
  setTimeout(() => {
    announcer!.textContent = message
  }, 100)

  // Clear message after announcement
  setTimeout(() => {
    announcer!.textContent = ''
  }, 3000)
}

/**
 * Check if reduced motion is preferred
 * @returns boolean indicating preference
 */
export function prefersReducedMotion(): boolean {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  return mediaQuery.matches
}

/**
 * Get contrast ratio between two colors
 * @param color1 First color (hex or rgb)
 * @param color2 Second color (hex or rgb)
 * @returns Contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Simplified luminance calculation
    // For production, use a library like chroma.js
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [r, g, b] = rgb.map((val) => {
      const sRGB = val / 255
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param ratio Contrast ratio
 * @param level WCAG level ('AA' or 'AAA')
 * @param isLargeText Whether text is large (18pt+)
 * @returns boolean indicating if ratio meets standard
 */
export function meetsContrastStandard(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Restore focus to a previously focused element
 * @param previousElement Element to restore focus to
 */
export function restoreFocus(previousElement: HTMLElement | null): void {
  if (previousElement && typeof previousElement.focus === 'function') {
    previousElement.focus()
  }
}

/**
 * Save the currently focused element
 * @returns Currently focused element
 */
export function saveFocus(): HTMLElement | null {
  return document.activeElement as HTMLElement
}
