/** Agent-level feature flags with env overrides.
 * Enable per environment: FEATURE_AGENT_SINGLAUB=true, etc.
 */

export type AgentKey =
  | 'SINGLAUB' | 'LEMAY' | 'ANGLETON' | 'BUDANOV' | 'WOLF' | 'HAREL' | 'GEHLEN';

const DEFAULT: Record<AgentKey, boolean> = {
  SINGLAUB: true,
  LEMAY: true,
  ANGLETON: true,
  BUDANOV: true,
  WOLF: true,
  HAREL: true,
  GEHLEN: true,
};

let runtime: Record<AgentKey, boolean> = { ...DEFAULT };

export function isAgentEnabled(agent: AgentKey): boolean {
  const key = `FEATURE_AGENT_${agent}`;
  const envVal = process.env[key];
  if (envVal !== undefined) return envVal.toLowerCase() === 'true';
  return runtime[agent];
}

export function setAgents(flags: Partial<Record<AgentKey, boolean>>): void {
  runtime = { ...runtime, ...flags } as any;
}

export function allAgents(): Record<AgentKey, boolean> { return { ...runtime }; }

export default { isAgentEnabled, setAgents, allAgents };

