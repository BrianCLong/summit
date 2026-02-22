import { chromium, Page } from '@playwright/test';
import { Rng } from './rng.js';
import { UiFuzzConfig, TraceEntry, Violation, RunResult, RunReport, RunMetrics } from './types.js';
import { redactString, redactUrl } from './redaction.js';
import { builtinProperties } from './properties.js';
import { loadSpecModule } from './spec_loader.js';

const nowMs = () => Number(process.hrtime.bigint() / 1000000n);

const getHost = (value: string) => {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
};

const isAllowedHost = (host: string, allowlist: string[]) =>
  allowlist.length === 0 || allowlist.includes(host);

const isAllowedUrl = (value: string, allowlist: string[]) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
    return isAllowedHost(url.hostname, allowlist);
  } catch {
    return false;
  }
};

const ensureAllowlist = (config: UiFuzzConfig) => {
  if (process.env.CI && config.allowlist.length === 0) {
    throw new Error('Allowlist is required in CI.');
  }
  const host = getHost(config.baseUrl);
  if (!isAllowedHost(host, config.allowlist)) {
    throw new Error(`Base URL host not allowlisted: ${host}`);
  }
};

const getStableSelector = async (handle: import('@playwright/test').ElementHandle) => {
  return handle.evaluate((el) => {
    const getIndex = (node: Element) => {
      if (!node.parentElement) return 1;
      const siblings = Array.from(node.parentElement.children).filter(
        (child) => child.tagName === node.tagName,
      );
      return siblings.indexOf(node) + 1;
    };

    const build = (node: Element | null): string => {
      if (!node) return '';
      if (node.tagName.toLowerCase() === 'html') return 'html';
      const tag = node.tagName.toLowerCase();
      const index = getIndex(node);
      const parent = build(node.parentElement);
      return parent ? `${parent} > ${tag}:nth-of-type(${index})` : `${tag}:nth-of-type(${index})`;
    };

    return build(el);
  });
};

const pickCandidate = async (page: Page, selector: string, rng: Rng) => {
  const handles = await page.$$(selector);
  if (handles.length === 0) return null;
  return handles[rng.nextInt(handles.length)] ?? null;
};

const actionClick = async (page: Page, rng: Rng): Promise<TraceEntry | null> => {
  const handle = await pickCandidate(
    page,
    'a,button,[role="button"],input[type="submit"],input[type="button"]',
    rng,
  );
  if (!handle) return null;
  const selector = await getStableSelector(handle);
  await handle.click({ timeout: 3000 });
  return {
    step: -1,
    type: 'click',
    selector,
  };
};

const actionType = async (page: Page, rng: Rng): Promise<TraceEntry | null> => {
  const handle = await pickCandidate(
    page,
    'input[type="text"],input[type="email"],input[type="search"],textarea',
    rng,
  );
  if (!handle) return null;
  const selector = await getStableSelector(handle);
  const inputValue = `fuzz-${rng.nextInt(10000)}`;
  await handle.fill(inputValue, { timeout: 3000 });
  return {
    step: -1,
    type: 'type',
    selector,
    inputLength: inputValue.length,
  };
};

const actionNavigateBack = async (page: Page): Promise<TraceEntry | null> => {
  const response = await page.goBack({ timeout: 3000, waitUntil: 'domcontentloaded' });
  if (!response) return null;
  return {
    step: -1,
    type: 'back',
  };
};

const actionReload = async (page: Page): Promise<TraceEntry | null> => {
  await page.reload({ timeout: 3000, waitUntil: 'domcontentloaded' });
  return {
    step: -1,
    type: 'reload',
  };
};

const actionNavigateHome = async (page: Page, baseUrl: string): Promise<TraceEntry | null> => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
  return {
    step: -1,
    type: 'navigate',
  };
};

const buildReport = (baseUrl: string, seed: number, violations: Violation[]): RunReport => {
  const byType: Record<string, number> = {};
  violations.forEach((entry) => {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  });
  return {
    schemaVersion: 1,
    baseUrl,
    seed,
    violations,
    summary: {
      count: violations.length,
      byType,
    },
  };
};

export const runProbe = async (config: UiFuzzConfig): Promise<RunResult> => {
  ensureAllowlist(config);

  const rng = new Rng(config.seed);
  const trace: TraceEntry[] = [];
  const violations: Violation[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let idleTimeouts = 0;
  let actionsExecuted = 0;
  let navigations = 0;

  const start = nowMs();
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage();

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = redactString(message.text());
    const allowed = config.consoleAllowlist.some((pattern) => pattern.test(text));
    if (!allowed) consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(redactString(error.message));
  });

  await page.route('**/*', (route) => {
    if (!isAllowedUrl(route.request().url(), config.allowlist)) {
      route.abort();
      return;
    }
    route.continue();
  });

  const specModule = await loadSpecModule(config.specPath);
  const customActions = specModule?.actions ?? [];
  const customProperties = specModule?.properties ?? [];
  const properties = [...builtinProperties(), ...customProperties];

  await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
  navigations += 1;

  const actionPool = [
    () => actionClick(page, rng),
    () => actionType(page, rng),
    () => actionNavigateBack(page),
    () => actionReload(page),
    () => actionNavigateHome(page, config.baseUrl),
    ...customActions.map((action) => () => action.run({ page, rng })),
  ];

  let step = 0;
  while (actionsExecuted < config.maxActions && nowMs() - start < config.timeBudgetMs) {
    const actionIndex = rng.nextInt(actionPool.length);
    const action = actionPool[actionIndex];
    let entry: TraceEntry | null = null;

    try {
      entry = await action();
    } catch (error) {
      violations.push({
        type: 'action_error',
        message: redactString(error instanceof Error ? error.message : String(error)),
        step,
      });
      if (config.exitOnViolation) break;
    }

    if (entry) {
      const urlAfter = redactUrl(page.url());
      if (!isAllowedUrl(page.url(), config.allowlist)) {
        const host = getHost(page.url());
        violations.push({
          type: 'navigation_disallowed',
          message: `Navigation to disallowed host ${host}`,
          step,
        });
        if (config.exitOnViolation) break;
      }
      const enriched: TraceEntry = {
        ...entry,
        step,
        urlAfter,
      };
      trace.push(enriched);
      actionsExecuted += 1;
      if (entry.type === 'navigate') navigations += 1;
      try {
        await page.waitForLoadState('networkidle', { timeout: config.idleTimeoutMs });
      } catch {
        idleTimeouts += 1;
      }
    }

    step += 1;
    if (navigations >= config.maxNavigations) break;
    if (violations.length > 0 && config.exitOnViolation) break;
  }

  const propertyContext = {
    consoleErrors,
    pageErrors,
    idleTimeouts,
  };

  properties.forEach((property) => {
    const found = property.evaluate(propertyContext);
    violations.push(...found);
  });

  await page.close();
  await browser.close();

  const durationMs = nowMs() - start;
  const report = buildReport(config.baseUrl, config.seed, violations);
  const traceBytes = Buffer.byteLength(trace.map((entry) => JSON.stringify(entry)).join('\n'));
  const exitCode = violations.length > 0 ? 1 : 0;

  const metrics: RunMetrics = {
    actionsExecuted,
    navigations,
    durationMs,
    traceBytes,
    violations: violations.length,
    exitCode,
  };

  return {
    trace,
    report,
    metrics,
    exitCode,
  };
};
