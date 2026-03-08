"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFocusOrder = computeFocusOrder;
exports.exportFocusOrder = exportFocusOrder;
const focusableSelector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [contenteditable="true"]';
function computeFocusOrder(root = document) {
    const elements = Array.from(root.querySelectorAll(focusableSelector)).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
    return elements.map((element, index) => ({
        index: index + 1,
        nodeName: element.tagName.toLowerCase(),
        nodeLabel: deriveLabel(element),
        tabIndex: element.tabIndex ?? 0,
    }));
}
function exportFocusOrder() {
    const steps = computeFocusOrder();
    return JSON.stringify(steps, null, 2);
}
function deriveLabel(element) {
    const label = element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        element.textContent?.trim() ||
        element.getAttribute('name') ||
        element.id;
    return label || 'unlabeled control';
}
