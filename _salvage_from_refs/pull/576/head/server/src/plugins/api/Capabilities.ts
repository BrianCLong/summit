export type Capability = 'readGraph' | 'export';

export function requireCapability(token: Capability, list: Capability[]) {
  if (!list.includes(token)) {
    throw new Error('capability denied');
  }
}
