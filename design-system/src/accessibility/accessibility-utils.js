// accessibility-utils.js
// Accessibility utilities and helpers for Summit platform

// Focus management utilities
export const focusFirstElement = (container) => {
  if (!container) {
    return;
  }
  
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
};

export const trapFocus = (element, _returnFocus = true) => {
  if (!element) {
    return;
  }
  
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) {
    return;
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') {
      return;
    }

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        event.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Focus the first element when trapping focus
  if (firstFocusable) {
    firstFocusable.focus();
  }

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

// Announce content to screen readers
export class LiveAnnouncer {
  constructor() {
    this.container = null;
  }

  setup() {
    if (this.container) {
      return;
    }

    this.container = document.createElement('div');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    this.container.className = 'sr-only';
    this.container.style.position = 'absolute';
    this.container.style.left = '-10000px';
    this.container.style.top = 'auto';
    this.container.style.width = '1px';
    this.container.style.height = '1px';
    this.container.style.overflow = 'hidden';

    document.body.appendChild(this.container);
  }

  announce(message) {
    if (!this.container) {
      this.setup();
    }

    // Clear the container and add the new message
    this.container.textContent = message;

    // Clear the message after a delay to prevent repetitive announcements
    setTimeout(() => {
      this.container.textContent = '';
    }, 1000);
  }
}

export const liveAnnouncer = new LiveAnnouncer();

// Screen reader only utility
export const srOnlyStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// Focus visible utility for better keyboard navigation
export const focusVisibleStyle = {
  outline: '2px solid #2196f3',
  outlineOffset: '2px',
};

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

// Check if user prefers high contrast
export const prefersHighContrast = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }
  return false;
};

// Check if user prefers dark mode
export const prefersDarkMode = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

// Generate unique IDs for accessibility attributes
export const generateId = () => {
  return `summit-${Math.random().toString(36).substr(2, 9)}`;
};