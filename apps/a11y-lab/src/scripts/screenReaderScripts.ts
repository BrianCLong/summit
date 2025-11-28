import { FocusStep, computeFocusOrder } from './focusOrder';

let liveRegion: HTMLElement | null = null;

export function applyLiveRegionAnnouncer() {
  if (!liveRegion) {
    liveRegion = document.getElementById('live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'live-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
  }

  return () => {
    liveRegion?.remove();
    liveRegion = null;
  };
}

export function announce(message: string) {
  if (!liveRegion) {
    applyLiveRegionAnnouncer();
  }
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}

export function ensureSkipLink() {
  if (document.querySelector('[data-a11y-skip-link]')) {
    return;
  }
  const skipLink = document.createElement('a');
  skipLink.href = '#main';
  skipLink.textContent = 'Skip to content';
  skipLink.className = 'sr-only';
  skipLink.setAttribute('data-a11y-skip-link', 'true');
  document.body.prepend(skipLink);
}

export function provideScreenReaderShortcuts({ selectors }: { selectors: string[] }) {
  const focusOrder = computeFocusOrder();
  const shortcutRegion = document.createElement('div');
  shortcutRegion.className = 'sr-only';
  shortcutRegion.setAttribute('data-a11y-shortcuts', 'true');
  shortcutRegion.textContent = `Tracking ${selectors.length} interactive selector groups. First focus target: ${
    focusOrder[0]?.nodeLabel || 'none'
  }.`;
  document.body.appendChild(shortcutRegion);
}

export function describeFocusOrder(): FocusStep[] {
  return computeFocusOrder();
}
