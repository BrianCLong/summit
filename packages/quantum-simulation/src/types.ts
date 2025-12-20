/**
 * Quantum Simulation Types
 * Defines interfaces for quantum circuits and simulation
 */

export type Complex = {
  real: number;
  imag: number;
};

export type QuantumState = Complex[];

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

  // Three-qubit gates
  TOFFOLI = 'TOFFOLI',
  FREDKIN = 'FREDKIN',

  // Measurement
  MEASURE = 'MEASURE',
}

export interface QuantumGate {
  type: GateType;
  qubits: number[];
  parameters?: number[];
  controlQubits?: number[];
  targetQubit?: number;
}

export interface QuantumCircuit {
  numQubits: number;
  gates: QuantumGate[];
  measurements?: number[];
}

export interface SimulationResult {
  counts: Record<string, number>;
  statevector?: QuantumState;
  executionTime: number;
  shots: number;
}

export interface QuantumSimulator {
  simulate(circuit: QuantumCircuit, shots?: number): Promise<SimulationResult>;
  getStatevector(circuit: QuantumCircuit): Promise<QuantumState>;
  applyGate(state: QuantumState, gate: QuantumGate): QuantumState;
}

export interface QuantumBackend {
  name: string;
  type: 'simulator' | 'hardware';
  maxQubits: number;
  supportedGates: GateType[];
  submit(circuit: QuantumCircuit): Promise<string>; // Returns job ID
  getResult(jobId: string): Promise<SimulationResult>;
  getStatus(jobId: string): Promise<'queued' | 'running' | 'completed' | 'failed'>;
}

export interface NoiseModel {
  depolarizingError?: number;
  thermalRelaxationT1?: number;
  thermalRelaxationT2?: number;
  readoutError?: number;
  gateError?: Record<GateType, number>;
}
