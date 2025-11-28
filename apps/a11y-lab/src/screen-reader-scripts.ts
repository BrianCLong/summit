/**
 * Helpers to test screen reader affordances without shipping analytics.
 */
export function injectLiveRegion() {
  const existing = document.getElementById('a11y-lab-live-region');
  if (existing) return existing;
  const region = document.createElement('div');
  region.id = 'a11y-lab-live-region';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.style.position = 'absolute';
  region.style.width = '1px';
  region.style.height = '1px';
  region.style.overflow = 'hidden';
  region.style.clip = 'rect(1px, 1px, 1px, 1px)';
  document.body.appendChild(region);
  return region;
}

export function announce(message: string) {
  const region = injectLiveRegion();
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 10);
}

export function exposeScreenReaderScripts() {
  (window as typeof window & { a11yLabAnnounce?: (message: string) => void }).a11yLabAnnounce = announce;
  return announce;
}
