"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLiveRegionAnnouncer = applyLiveRegionAnnouncer;
exports.announce = announce;
exports.ensureSkipLink = ensureSkipLink;
exports.provideScreenReaderShortcuts = provideScreenReaderShortcuts;
exports.describeFocusOrder = describeFocusOrder;
const focusOrder_1 = require("./focusOrder");
let liveRegion = null;
function applyLiveRegionAnnouncer() {
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
function announce(message) {
    if (!liveRegion) {
        applyLiveRegionAnnouncer();
    }
    if (liveRegion) {
        liveRegion.textContent = message;
    }
}
function ensureSkipLink() {
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
function provideScreenReaderShortcuts({ selectors }) {
    const focusOrder = (0, focusOrder_1.computeFocusOrder)();
    const shortcutRegion = document.createElement('div');
    shortcutRegion.className = 'sr-only';
    shortcutRegion.setAttribute('data-a11y-shortcuts', 'true');
    shortcutRegion.textContent = `Tracking ${selectors.length} interactive selector groups. First focus target: ${focusOrder[0]?.nodeLabel || 'none'}.`;
    document.body.appendChild(shortcutRegion);
}
function describeFocusOrder() {
    return (0, focusOrder_1.computeFocusOrder)();
}
