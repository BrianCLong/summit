/**
 * Shared Quantum Types
 * Common type definitions for quantum computing packages
 */

// ============================================
// Complex Numbers
// ============================================

export interface Complex {
  real: number;
  imag: number;
}

export function complex(real: number, imag: number = 0): Complex {
  return { real, imag };
}

export function complexAdd(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

export function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

export function complexMagnitude(c: Complex): number {
  return Math.sqrt(c.real * c.real + c.imag * c.imag);
}

export function complexConjugate(c: Complex): Complex {
  return { real: c.real, imag: -c.imag };
}

// ============================================
// Quantum State Types
// ============================================

export type QuantumState = Complex[];

export type Qubit = 0 | 1;

export type BitString = string;

// ============================================
// Quantum Gate Types
// ============================================

export enum GateType {
  // Single-qubit gates
  IDENTITY = 'I',
  PAULI_X = 'X',
  PAULI_Y = 'Y',
  PAULI_Z = 'Z',
  HADAMARD = 'H',
  PHASE = 'S',
  T_GATE = 'T',
  RX = 'RX',
  RY = 'RY',
  RZ = 'RZ',

  // Two-qubit gates
  CNOT = 'CNOT',
  CZ = 'CZ',
  SWAP = 'SWAP',
  ISWAP = 'ISWAP',

  // Three-qubit gates
  TOFFOLI = 'TOFFOLI',
  FREDKIN = 'FREDKIN',

  // Measurement
  MEASURE = 'MEASURE',
  RESET = 'RESET',
}

export interface QuantumGate {
  type: GateType | string;
  qubits: number[];
  parameters?: number[];
  controlQubits?: number[];
  targetQubit?: number;
  label?: string;
}

// ============================================
// Quantum Circuit Types
// ============================================

export interface QuantumCircuit {
  numQubits: number;
  gates: QuantumGate[];
  measurements?: number[];
  name?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Simulation Types
// ============================================

export interface SimulationResult {
  counts: Record<BitString, number>;
  statevector?: QuantumState;
  executionTime: number;
  shots: number;
  metadata?: Record<string, unknown>;
}

export interface QuantumSimulator {
  simulate(circuit: QuantumCircuit, shots?: number): Promise<SimulationResult>;
  getStatevector(circuit: QuantumCircuit): Promise<QuantumState>;
  applyGate?(state: QuantumState, gate: QuantumGate): QuantumState;
}

// ============================================
// Quantum Backend Types
// ============================================

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface QuantumBackend {
  name: string;
  type: 'simulator' | 'hardware';
  maxQubits: number;
  supportedGates: (GateType | string)[];
  submit(circuit: QuantumCircuit): Promise<string>;
  getResult(jobId: string): Promise<SimulationResult>;
  getStatus(jobId: string): Promise<JobStatus>;
  cancel?(jobId: string): Promise<boolean>;
}

export interface NoiseModel {
  depolarizingError?: number;
  thermalRelaxationT1?: number;
  thermalRelaxationT2?: number;
  readoutError?: number;
  gateError?: Record<string, number>;
}

// ============================================
// Optimization Types
// ============================================

export interface OptimizationResult {
  solution: string | number[];
  value: number;
  iterations: number;
  convergence: number[];
  parameters?: Record<string, number[]>;
}

export interface Hamiltonian {
  terms: Array<{
    coefficient: number;
    pauliString: string;
  }>;
}

// ============================================
// Cryptography Types
// ============================================

export enum SecurityLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5,
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  algorithm: string;
  securityLevel: SecurityLevel;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EncapsulatedSecret {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

export interface Signature {
  signature: Uint8Array;
  algorithm: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// Utility Types
// ============================================

export type Matrix2D = number[][];
export type Vector = number[];

export interface Benchmark {
  operation: string;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}
