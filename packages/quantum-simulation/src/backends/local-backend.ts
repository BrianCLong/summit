/**
 * Local Quantum Backend
 * Local simulator backend for development and testing
 */

import { QuantumBackend, QuantumCircuit, SimulationResult, GateType } from '../types';
import { StatevectorSimulator } from '../simulators/statevector-simulator';

export class LocalBackend implements QuantumBackend {
  name = 'local-simulator';
  type: 'simulator' | 'hardware' = 'simulator';
  maxQubits = 25; // Practical limit for statevector simulation
  supportedGates: GateType[] = [
    GateType.IDENTITY,
    GateType.PAULI_X,
    GateType.PAULI_Y,
    GateType.PAULI_Z,
    GateType.HADAMARD,
    GateType.PHASE,
    GateType.T_GATE,
    GateType.RX,
    GateType.RY,
    GateType.RZ,
    GateType.CNOT,
    GateType.CZ,
    GateType.SWAP,
  ];

  private simulator: StatevectorSimulator;
  private jobs: Map<string, { status: 'queued' | 'running' | 'completed' | 'failed'; result?: SimulationResult }>;

  constructor() {
    this.simulator = new StatevectorSimulator();
    this.jobs = new Map();
  }

  async submit(circuit: QuantumCircuit): Promise<string> {
    const jobId = this.generateJobId();

    // Validate circuit
    if (circuit.numQubits > this.maxQubits) {
      throw new Error(`Circuit requires ${circuit.numQubits} qubits, but backend supports max ${this.maxQubits}`);
    }

    // Queue job
    this.jobs.set(jobId, { status: 'queued' });

    // Run simulation asynchronously
    this.runSimulation(jobId, circuit);

    return jobId;
  }

  async getResult(jobId: string): Promise<SimulationResult> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'completed') {
      throw new Error(`Job ${jobId} has not completed (status: ${job.status})`);
    }

    return job.result!;
  }

  async getStatus(jobId: string): Promise<'queued' | 'running' | 'completed' | 'failed'> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return job.status;
  }

  private async runSimulation(jobId: string, circuit: QuantumCircuit): Promise<void> {
    const job = this.jobs.get(jobId)!;

    try {
      job.status = 'running';

      const result = await this.simulator.simulate(circuit, 1024);

      job.status = 'completed';
      job.result = result;
    } catch (error) {
      job.status = 'failed';
      console.error(`Job ${jobId} failed:`, error);
    }
  }

  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export function createLocalBackend(): QuantumBackend {
  return new LocalBackend();
}
