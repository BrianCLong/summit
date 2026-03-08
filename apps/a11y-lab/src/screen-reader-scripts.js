"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectLiveRegion = injectLiveRegion;
exports.announce = announce;
exports.exposeScreenReaderScripts = exposeScreenReaderScripts;
/**
 * Helpers to test screen reader affordances without shipping analytics.
 */
function injectLiveRegion() {
    const existing = document.getElementById('a11y-lab-live-region');
    if (existing)
        return existing;
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
function announce(message) {
    const region = injectLiveRegion();
    region.textContent = '';
    window.setTimeout(() => {
        region.textContent = message;
    }, 10);
}
function exposeScreenReaderScripts() {
    window.a11yLabAnnounce = announce;
    return announce;
}
