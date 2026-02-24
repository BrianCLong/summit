import { SwitchboardRegistryEntry } from './types';

export const switchboardRegistry: SwitchboardRegistryEntry[] = [];

export function registerSwitchboardEntry(
  entry: SwitchboardRegistryEntry,
): void {
  switchboardRegistry.push(entry);
}
