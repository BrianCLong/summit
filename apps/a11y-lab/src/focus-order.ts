import type { Page } from '@playwright/test';

export interface FocusStep {
  label: string;
  selector: string;
}

export interface FocusMapResult {
  steps: FocusStep[];
  trapped: boolean;
}

const MAX_STEPS = 75;

async function getActiveDescriptor(page: Page): Promise<FocusStep> {
  const descriptor = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return { label: 'none', selector: 'document' };
    const name = active.getAttribute('aria-label') || active.innerText?.trim() || active.id || active.tagName;
    let selector = active.id ? `#${active.id}` : active.tagName.toLowerCase();
    if (active.className) {
      selector += `.${active.className.toString().split(/\s+/).filter(Boolean).join('.')}`;
    }
    return { label: name || 'unnamed', selector };
  });
  return descriptor;
}

export async function walkFocusOrder(page: Page): Promise<FocusMapResult> {
  const seenSelectors = new Set<string>();
  const steps: FocusStep[] = [];
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
