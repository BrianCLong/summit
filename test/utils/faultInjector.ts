type FaultScenario = 'transient-timeout' | 'permanent-failure' | 'none';

export type InjectedFault =
  | { kind: 'transient'; code: string; message: string }
  | { kind: 'permanent'; code: string; message: string };

const hashSeed = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Force 32-bit integer
  }
  return Math.abs(hash);
};

export class FaultInjector {
  private readonly firstFaultAt: number;

  private readonly seed: string;

  private readonly scenario: FaultScenario;

  private injections = 0;

  constructor(seed: string, scenario: FaultScenario) {
    this.seed = seed;
    this.scenario = scenario;
    const hashed = hashSeed(`${seed}:${scenario}`);
    this.firstFaultAt = (hashed % 2) + 1; // deterministically 1 or 2
  }

  nextFault(): InjectedFault | null {
    this.injections += 1;

    if (this.scenario === 'none') {
      return null;
    }

    if (this.scenario === 'transient-timeout') {
      if (this.injections === this.firstFaultAt) {
        return {
          kind: 'transient',
          code: 'ETIMEDOUT',
          message: `Injected timeout [seed=${this.seed}]`,
        };
      }
      return null;
    }

    return {
      kind: 'permanent',
      code: 'INGESTION_PERMANENT_FAILURE',
      message: `Injected permanent failure [seed=${this.seed}]`,
    };
  }
}

export const createFaultInjector = (seed: string, scenario: FaultScenario): FaultInjector =>
  new FaultInjector(seed, scenario);
