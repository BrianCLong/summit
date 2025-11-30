export type FocusStep = {
  index: number;
  nodeName: string;
  nodeLabel: string;
  tabIndex: number;
};

const focusableSelector =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [contenteditable="true"]';

export function computeFocusOrder(root: ParentNode = document): FocusStep[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
  );

  return elements.map((element, index) => ({
    index: index + 1,
    nodeName: element.tagName.toLowerCase(),
    nodeLabel: deriveLabel(element),
    tabIndex: element.tabIndex ?? 0,
  }));
}

export function exportFocusOrder(): string {
  const steps = computeFocusOrder();
  return JSON.stringify(steps, null, 2);
}

function deriveLabel(element: HTMLElement): string {
  const label =
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent?.trim() ||
    element.getAttribute('name') ||
    element.id;
  return label || 'unlabeled control';
}
