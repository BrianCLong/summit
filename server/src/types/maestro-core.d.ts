declare module '@intelgraph/maestro-core' {
  export type MaestroCoreConfig = Record<string, unknown>;

  export class ForkDetector {
    static calculateEntropy(input: Record<string, unknown>): number;
  }
}
