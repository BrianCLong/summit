import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, afterEach } from '@jest/globals';
import { MockedProvider } from '@apollo/client/testing';
import type { ReactElement } from 'react';
import { ExplainDecisionHarness } from '../ExplainDecisionHarness';
import { explainDecisionFixture } from '../fixtures';
import { createExplainDecisionMocks } from '../ExplainDecision.mocks';
import { ExplainDecision } from '../ExplainDecision';

type RoleName = 'heading' | 'region' | 'switch' | 'button';

type QueryOptions = {
  name?: string | RegExp;
};

type RenderResult = {
  container: HTMLElement;
  getByRole: (role: RoleName, options?: QueryOptions) => HTMLElement;
  queryByRole: (role: RoleName, options?: QueryOptions) => HTMLElement | null;
  findByRole: (role: RoleName, options?: QueryOptions) => Promise<HTMLElement>;
  unmount: () => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';

const getAccessibleName = (element: HTMLElement) => {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return normalize(ariaLabel);
  }

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map((id) => normalize(document.getElementById(id)?.textContent ?? ''))
      .filter(Boolean)
      .join(' ');
  }

  return normalize(element.textContent);
};

const computeRole = (element: HTMLElement): RoleName | null => {
  const explicit = element.getAttribute('role') as RoleName | null;
  if (explicit) {
    return explicit;
  }

  switch (element.tagName.toLowerCase()) {
    case 'button':
      return 'button';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading';
    case 'section':
      return element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby') ? 'region' : null;
    default:
      return null;
  }
};

const matchesName = (element: HTMLElement, name?: string | RegExp) => {
  if (!name) return true;
  const accessibleName = getAccessibleName(element);
  if (typeof name === 'string') {
    return accessibleName === normalize(name);
  }
  return name.test(accessibleName);
};

const queryAllByRole = (container: HTMLElement, role: RoleName, options: QueryOptions = {}) => {
  const matches: HTMLElement[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const current = walker.currentNode as HTMLElement;
    const currentRole = computeRole(current);
    if (currentRole === role && matchesName(current, options.name)) {
      matches.push(current);
    }
  }
  return matches;
};

const getByRole = (container: HTMLElement, role: RoleName, options?: QueryOptions) => {
  const matches = queryAllByRole(container, role, options);
  if (!matches.length) {
    throw new Error(`Unable to locate role="${role}" with name ${options?.name ?? 'undefined'}`);
  }
  return matches[0];
};

const queryByRole = (container: HTMLElement, role: RoleName, options?: QueryOptions) => {
  const matches = queryAllByRole(container, role, options);
  return matches[0] ?? null;
};

const findByRole = async (container: HTMLElement, role: RoleName, options?: QueryOptions) => {
  const timeout = Date.now() + 4000;
  while (Date.now() < timeout) {
    const match = queryByRole(container, role, options);
    if (match) {
      return match;
    }
    await sleep(25);
  }
  throw new Error(`Timed out waiting for role="${role}"`);
};

const renderComponent = async (element: ReactElement): Promise<RenderResult> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(element);
  });

  return {
    container,
    getByRole: (role, options) => getByRole(container, role, options),
    queryByRole: (role, options) => queryByRole(container, role, options),
    findByRole: (role, options) => findByRole(container, role, options),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

type A11yNode = {
  targetName: string;
  message: string;
};

type A11yResult = {
  violations: A11yNode[];
};

const formatTargetName = (element: HTMLElement) => {
  const role = computeRole(element);
  const name = getAccessibleName(element) || element.tagName.toLowerCase();
  return role ? `${name} [role="${role}"]` : name;
};

const runA11yChecks = (container: HTMLElement): A11yResult => {
  const violations: A11yNode[] = [];

  queryAllByRole(container, 'switch').forEach((switchEl) => {
    if (!switchEl.hasAttribute('aria-checked')) {
      violations.push({
        targetName: formatTargetName(switchEl),
        message: 'Switch controls must expose an aria-checked state.',
      });
    }

    const controls = switchEl.getAttribute('aria-controls');
    if (controls && !container.querySelector<HTMLElement>(`#${CSS.escape(controls)}`)) {
      violations.push({
        targetName: formatTargetName(switchEl),
        message: `aria-controls references missing element #${controls}.`,
      });
    }
  });

  container.querySelectorAll<HTMLElement>('[role="tooltip"]').forEach((tooltip) => {
    if (!tooltip.id) {
      violations.push({ targetName: 'tooltip', message: 'Tooltips must expose an id attribute.' });
      return;
    }

    const describedBy = container.querySelector<HTMLElement>(`[aria-describedby~="${CSS.escape(tooltip.id)}"]`);
    if (!describedBy) {
      violations.push({
        targetName: `#${tooltip.id}`,
        message: 'Tooltip must be referenced by an element using aria-describedby.',
      });
    }
  });

  if (!container.querySelector('[aria-live]')) {
    violations.push({ targetName: 'document', message: 'At least one live region should announce layer changes.' });
  }

  return { violations };
};

describe('ExplainDecision', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('renders the explanation with all layers visible by default', async () => {
    const view = await renderComponent(<ExplainDecisionHarness paragraphId="para-17" />);
    cleanup = view.unmount;

    const heading = await view.findByRole('heading', { name: /Paragraph 17 determination overview/i });
    expect(heading).toBeTruthy();

    const evidence = view.getByRole('region', { name: /Evidence layer/i });
    expect(evidence.querySelectorAll('article')).toHaveLength(explainDecisionFixture.evidence.length);

    const dissent = view.getByRole('region', { name: /Dissent layer/i });
    expect(dissent.querySelectorAll('article')).toHaveLength(explainDecisionFixture.dissents.length);

    const policy = view.getByRole('region', { name: /Policy layer/i });
    expect(policy.querySelectorAll('article')).toHaveLength(explainDecisionFixture.policies.length);

    expect(view.container).toMatchSnapshot();
  });

  it('allows toggling layers with keyboard and mouse interactions', async () => {
    const view = await renderComponent(<ExplainDecisionHarness paragraphId="para-17" />);
    cleanup = view.unmount;

    const evidenceToggle = await view.findByRole('switch', { name: /Evidence map/i });
    const dissentToggle = view.getByRole('switch', { name: /Recorded dissent/i });

    await act(async () => {
      evidenceToggle.click();
    });
    expect(view.queryByRole('region', { name: /Evidence layer/i })).toBeNull();

    await act(async () => {
      dissentToggle.focus();
      dissentToggle.click();
    });
    expect(view.queryByRole('region', { name: /Dissent layer/i })).toBeNull();

    const policyToggle = view.getByRole('switch', { name: /Gating authorities/i });
    policyToggle.focus();
    expect(document.activeElement).toBe(policyToggle);
  });

  it('supports roving focus within the evidence list', async () => {
    const view = await renderComponent(
      <MockedProvider mocks={createExplainDecisionMocks()}>
        <ExplainDecision paragraphId="para-17" />
      </MockedProvider>,
    );
    cleanup = view.unmount;

    const firstEvidenceButton = await view.findByRole('button', {
      name: /SIGINT intercept corroborating logistics timeline/i,
    });

    firstEvidenceButton.focus();
    expect(document.activeElement).toBe(firstEvidenceButton);

    await act(async () => {
      firstEvidenceButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await sleep(0);
    });

    const secondEvidenceButton = await view.findByRole('button', {
      name: /Imagery analysis of convoy dispersal/i,
    });
    expect(document.activeElement).toBe(secondEvidenceButton);
  });

  it('has no detectable accessibility violations', async () => {
    const view = await renderComponent(<ExplainDecisionHarness paragraphId="para-17" />);
    cleanup = view.unmount;
    await view.findByRole('heading', { name: /Paragraph 17 determination overview/i });

    const results = runA11yChecks(view.container);
    expect(results.violations).toHaveLength(0);
  });
});
