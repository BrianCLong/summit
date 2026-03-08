"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkFocusOrder = walkFocusOrder;
const MAX_STEPS = 75;
async function getActiveDescriptor(page) {
    const descriptor = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active)
            return { label: 'none', selector: 'document' };
        const name = active.getAttribute('aria-label') || active.innerText?.trim() || active.id || active.tagName;
        let selector = active.id ? `#${active.id}` : active.tagName.toLowerCase();
        if (active.className) {
            selector += `.${active.className.toString().split(/\s+/).filter(Boolean).join('.')}`;
        }
        return { label: name || 'unnamed', selector };
    });
    return descriptor;
}
async function walkFocusOrder(page) {
    const seenSelectors = new Set();
    const steps = [];
    let trapped = false;
    for (let i = 0; i < MAX_STEPS; i += 1) {
        await page.keyboard.press('Tab');
        const descriptor = await getActiveDescriptor(page);
        steps.push(descriptor);
        const key = `${descriptor.selector}:${descriptor.label}`;
        if (seenSelectors.has(key)) {
            trapped = true;
            break;
        }
        seenSelectors.add(key);
    }
    return { steps, trapped };
}
