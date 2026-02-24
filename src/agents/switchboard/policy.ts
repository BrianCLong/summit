export type SwitchboardPolicy = {
  allow: Array<{
    role: string;
    capabilities: string[];
    environments?: string[];
  }>;
};

export function isAllowed(
  policy: SwitchboardPolicy,
  role: string,
  cap: string,
  env: string,
): boolean {
  return policy.allow.some(
    (rule) =>
      rule.role === role &&
      rule.capabilities.includes(cap) &&
      (!rule.environments || rule.environments.includes(env)),
  );
}
