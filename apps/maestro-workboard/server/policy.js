export const capabilityProfiles = [
  {
    id: 'read-only',
    label: 'Read-only (no network, no writes)',
    allowsWrite: false,
    allowsNetwork: false,
    allowsSecrets: false,
  },
  {
    id: 'read-write',
    label: 'Read/write (no network, no secrets)',
    allowsWrite: true,
    allowsNetwork: false,
    allowsSecrets: false,
  },
  {
    id: 'network',
    label: 'Read/write + network (no secrets)',
    allowsWrite: true,
    allowsNetwork: true,
    allowsSecrets: false,
  },
];

const COMMAND_POLICY = {
  git: {
    requiresWrite: true,
    allowsNetwork: false,
  },
  'git-read': {
    requiresWrite: false,
    allowsNetwork: false,
  },
  node: {
    requiresWrite: false,
    allowsNetwork: false,
  },
};

export const resolveCapabilityProfile = (id) =>
  capabilityProfiles.find((profile) => profile.id === id) ??
  capabilityProfiles[0];

export const assertToolAllowed = ({
  capabilityProfile,
  command,
  requiresWrite,
  requiresNetwork,
}) => {
  const profile = resolveCapabilityProfile(capabilityProfile);
  if (requiresWrite && !profile.allowsWrite) {
    return {
      allowed: false,
      reason: 'Write capability required but not granted.',
    };
  }
  if (requiresNetwork && !profile.allowsNetwork) {
    return {
      allowed: false,
      reason: 'Network capability required but not granted.',
    };
  }
  const policy = COMMAND_POLICY[command];
  if (!policy) {
    return {
      allowed: false,
      reason: `Command ${command} is not allowlisted.`,
    };
  }
  if (policy.requiresWrite && !profile.allowsWrite) {
    return {
      allowed: false,
      reason: 'Command requires write capability but profile is read-only.',
    };
  }
  if (policy.allowsNetwork && !profile.allowsNetwork) {
    return {
      allowed: false,
      reason: 'Command requires network capability but profile is offline.',
    };
  }
  return { allowed: true };
};
