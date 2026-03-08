"use strict";
/**
 * Local Quantum Backend
 * Local simulator backend for development and testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalBackend = void 0;
exports.createLocalBackend = createLocalBackend;
const types_1 = require("../types");
const statevector_simulator_1 = require("../simulators/statevector-simulator");
class LocalBackend {
    name = 'local-simulator';
    type = 'simulator';
    maxQubits = 25; // Practical limit for statevector simulation
    supportedGates = [
        types_1.GateType.IDENTITY,
        types_1.GateType.PAULI_X,
        types_1.GateType.PAULI_Y,
        types_1.GateType.PAULI_Z,
        types_1.GateType.HADAMARD,
        types_1.GateType.PHASE,
        types_1.GateType.T_GATE,
        types_1.GateType.RX,
        types_1.GateType.RY,
        types_1.GateType.RZ,
        types_1.GateType.CNOT,
        types_1.GateType.CZ,
        types_1.GateType.SWAP,
    ];
    simulator;
    jobs;
    constructor() {
        this.simulator = new statevector_simulator_1.StatevectorSimulator();
        this.jobs = new Map();
    }
    async submit(circuit) {
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
    async getResult(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        if (job.status !== 'completed') {
            throw new Error(`Job ${jobId} has not completed (status: ${job.status})`);
        }
        return job.result;
    }
    async getStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        return job.status;
    }
    async runSimulation(jobId, circuit) {
        const job = this.jobs.get(jobId);
        try {
            job.status = 'running';
            const result = await this.simulator.simulate(circuit, 1024);
            job.status = 'completed';
            job.result = result;
        }
        catch (error) {
            job.status = 'failed';
            console.error(`Job ${jobId} failed:`, error);
        }
    }
    generateJobId() {
        return `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
exports.LocalBackend = LocalBackend;
function createLocalBackend() {
    return new LocalBackend();
}
