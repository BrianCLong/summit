import {
  SwitchboardHydratedConfig,
  SwitchboardRegistryEntry,
} from './types';

export type SwitchboardAuthResolver = (authRef: string) => {
  redacted: string;
};

export function hydrateConfig(
  entry: SwitchboardRegistryEntry,
  resolveAuth: SwitchboardAuthResolver,
): SwitchboardHydratedConfig {
  if (!entry.authRef) {
    throw new Error('Switchboard config hydration requires authRef.');
  }

  const auth = resolveAuth(entry.authRef);

  return {
    endpoint: entry.endpoint,
    transport: entry.transport,
    auth: {
      authRef: entry.authRef,
      redacted: auth.redacted,
    },
  };
}
