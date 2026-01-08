// server/tests/setup/reliability.ts

/**
 * Reliability test helpers to enforce Drift Prevention policies.
 *
 * Includes:
 * - NO_NETWORK_LISTEN gating
 * - Conditional test execution (itIf, describeIf)
 * - Resource teardown registry
 */

export const isNetworkListenAllowed = () => process.env.NO_NETWORK_LISTEN !== 'true';

export const itIf = (condition: boolean) => (condition ? it : it.skip);
export const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

// Resource Teardown Registry
type Closable = { close: () => Promise<void> | void } | { quit: () => Promise<void> | void } | { end: () => Promise<void> | void };

const resources = new Set<Closable>();

export const registerClosable = (resource: Closable) => {
  resources.add(resource);
};

export const closeAll = async () => {
  const errors: Error[] = [];
  for (const resource of resources) {
    try {
      if ('close' in resource) await resource.close();
      else if ('quit' in resource) await resource.quit();
      else if ('end' in resource) await resource.end();
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }
  resources.clear();
  if (errors.length > 0) {
    console.error(`Reliability Teardown: ${errors.length} errors occurred during cleanup.`);
    errors.forEach(e => console.error(e));
  }
};

// Auto-hook into Jest if available
if (typeof afterAll === 'function') {
  afterAll(async () => {
    await closeAll();
  });
}
