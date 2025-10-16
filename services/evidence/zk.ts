export type Obl = { name: string; value: number; min?: number; max?: number };
export interface ZkProver {
  prove(obls: Obl[]): Promise<{ proof: string; pub: string }>;
}
export interface ZkVerifier {
  verify(proof: string, pub: string): Promise<boolean>;
}
