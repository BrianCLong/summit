import { SwitchboardRegistryEntry } from './types';

export type SwitchboardHealthProbe = (
  entry: SwitchboardRegistryEntry,
) => Promise<boolean>;

export async function checkHealth(
  entry: SwitchboardRegistryEntry,
  probe: SwitchboardHealthProbe,
): Promise<boolean> {
  if (!entry.healthcheck) {
    return true;
  }

  return probe(entry);
}
