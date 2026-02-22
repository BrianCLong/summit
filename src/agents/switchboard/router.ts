import { isAllowed, SwitchboardPolicy } from './policy';
import { RoutingDecision, SwitchboardRegistryEntry } from './types';

export function route(opts: {
  role: string;
  env: string;
  requestedCapabilities: string[];
  registry: SwitchboardRegistryEntry[];
  policy: SwitchboardPolicy;
}): RoutingDecision {
  for (const cap of opts.requestedCapabilities) {
    if (!isAllowed(opts.policy, opts.role, cap, opts.env)) {
      return {
        requestedCapabilities: opts.requestedCapabilities,
        deniedReason: `DENY_CAP:${cap}`,
      };
    }
  }

  const candidate = opts.registry.find((server) =>
    opts.requestedCapabilities.every((cap) =>
      server.capabilities.includes(cap),
    ),
  );

  if (!candidate) {
    return {
      requestedCapabilities: opts.requestedCapabilities,
      deniedReason: 'NO_MATCH',
    };
  }

  if (!candidate.authRef) {
    return {
      requestedCapabilities: opts.requestedCapabilities,
      deniedReason: 'MISSING_AUTHREF',
    };
  }

  return {
    requestedCapabilities: opts.requestedCapabilities,
    chosenServerId: candidate.id,
  };
}
