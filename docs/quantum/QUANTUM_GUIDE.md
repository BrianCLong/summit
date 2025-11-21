# Summit Quantum Computing Guide

## Overview

This guide provides comprehensive documentation for Summit's quantum computing capabilities, including post-quantum cryptography, quantum simulation, quantum optimization, and quantum machine learning.

## Table of Contents

1. [Post-Quantum Cryptography](#post-quantum-cryptography)
2. [Quantum Simulation](#quantum-simulation)
3. [Quantum Optimization](#quantum-optimization)
4. [Quantum Machine Learning](#quantum-machine-learning)
5. [Hybrid Quantum-Classical Workflows](#hybrid-quantum-classical-workflows)
6. [Cloud Quantum Integration](#cloud-quantum-integration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Post-Quantum Cryptography

### Overview

Summit implements NIST-standardized post-quantum cryptographic algorithms to protect against future quantum computer attacks.

### Supported Algorithms

#### Key Encapsulation

**CRYSTALS-Kyber**
```typescript
import { createKyberKEM, SecurityLevel } from '@summit/post-quantum-crypto';

// Create Kyber KEM with security level 3 (recommended)
const kem = createKyberKEM(SecurityLevel.LEVEL_3);

// Generate key pair
const keyPair = await kem.generateKeyPair();

// Encapsulate (sender side)
const { ciphertext, sharedSecret } = await kem.encapsulate(keyPair.publicKey);

// Decapsulate (receiver side)
const recoveredSecret = await kem.decapsulate(ciphertext, keyPair.privateKey);

console.assert(recoveredSecret.equals(sharedSecret));
```

**Hybrid KEM (Recommended)**
```typescript
import { createHybridKEM } from '@summit/post-quantum-crypto';

// Combines X25519 with Kyber-768 for defense-in-depth
const hybridKEM = createHybridKEM('x25519');

const keyPair = await hybridKEM.generateKeyPair();
const { ciphertext, sharedSecret } = await hybridKEM.encapsulate(keyPair.publicKey);
```

#### Digital Signatures

**CRYSTALS-Dilithium**
```typescript
import { createDilithiumSignature, SecurityLevel } from '@summit/post-quantum-crypto';

const dss = createDilithiumSignature(SecurityLevel.LEVEL_3);

// Generate key pair
const keyPair = await dss.generateKeyPair();

// Sign message
const message = new TextEncoder().encode('Hello, Quantum World!');
const { signature } = await dss.sign(message, keyPair.privateKey);

// Verify signature
const isValid = await dss.verify(message, signature, keyPair.publicKey);
console.log('Signature valid:', isValid);
```

**FALCON (Compact Signatures)**
```typescript
import { createFalconSignature } from '@summit/post-quantum-crypto';

const falcon = createFalconSignature(SecurityLevel.LEVEL_1);

const keyPair = await falcon.generateKeyPair();
const { signature } = await falcon.sign(message, keyPair.privateKey);

// FALCON signatures are ~40% smaller than Dilithium
console.log('Signature size:', signature.length);
```

**SPHINCS+ (Hash-based, Stateless)**
```typescript
import { createSphincsSignature } from '@summit/post-quantum-crypto';

// Use 'fast' variant for better performance, 's' for smaller signatures
const sphincs = createSphincsSignature(SecurityLevel.LEVEL_5, true);

const keyPair = await sphincs.generateKeyPair();
const { signature } = await sphincs.sign(message, keyPair.privateKey);
```

### Performance Benchmarking

```typescript
import { createBenchmarker } from '@summit/post-quantum-crypto';

const benchmarker = createBenchmarker(100);

// Benchmark Kyber KEM
const kemResults = await benchmarker.benchmarkKEM(kem);

// Benchmark Dilithium signatures
const sigResults = await benchmarker.benchmarkSignature(dss);

// Print formatted results
console.log(benchmarker.formatResults([...kemResults, ...sigResults]));
```

### Validation

```typescript
import { createValidator } from '@summit/post-quantum-crypto';

const validator = createValidator();

// Validate KEM correctness
const kemValid = await validator.validateKEM(kem, 100);
console.log('KEM validation:', kemValid ? 'PASS' : 'FAIL');

// Validate signature scheme
const sigValid = await validator.validateSignature(dss, 100);
console.log('Signature validation:', sigValid ? 'PASS' : 'FAIL');

// Test non-repudiation
const nonRepudiationPass = await validator.testNonRepudiation(dss);
```

---

## Quantum Simulation

### Overview

Summit provides a complete quantum circuit simulation framework with support for various backends.

### Building Quantum Circuits

```typescript
import { createCircuit } from '@summit/quantum-simulation';

// Create a 3-qubit circuit
const circuit = createCircuit(3)
  .h(0)                    // Hadamard on qubit 0
  .cnot(0, 1)              // CNOT from qubit 0 to 1
  .cnot(1, 2)              // CNOT from qubit 1 to 2
  .measure()               // Measure all qubits
  .build();

console.log('Created GHZ state circuit');
```

### Simulating Circuits

```typescript
import { createStatevectorSimulator } from '@summit/quantum-simulation';

const simulator = createStatevectorSimulator();

// Simulate with 1024 shots
const result = await simulator.simulate(circuit, 1024);

console.log('Measurement counts:', result.counts);
console.log('Execution time:', result.executionTime, 'ms');
```

### Common Quantum States

**Bell State**
```typescript
const bellCircuit = createCircuit(2)
  .createBellState(0, 1)
  .measure()
  .build();
```

**GHZ State**
```typescript
const ghzCircuit = createCircuit(4)
  .createGHZState([0, 1, 2, 3])
  .measure()
  .build();
```

**Quantum Fourier Transform**
```typescript
const qftCircuit = createCircuit(4)
  .qft([0, 1, 2, 3])
  .measure()
  .build();
```

### Custom Gate Sequences

```typescript
const customCircuit = createCircuit(2)
  // Prepare superposition
  .h(0)
  .h(1)

  // Apply rotations
  .rx(0, Math.PI / 4)
  .ry(1, Math.PI / 3)

  // Entangle
  .cnot(0, 1)

  // Phase gates
  .s(0)
  .t(1)

  .measure()
  .build();
```

---

## Quantum Optimization

### Overview

Summit implements quantum-inspired optimization algorithms for solving combinatorial optimization problems.

### QAOA (Quantum Approximate Optimization Algorithm)

```typescript
import { createQAOAOptimizer } from '@summit/quantum-optimization';
import { createStatevectorSimulator } from '@summit/quantum-simulation';

const simulator = createStatevectorSimulator();

// Define a Max-Cut problem
const edges = [
  { i: 0, j: 1, weight: 1 },
  { i: 1, j: 2, weight: 1 },
  { i: 2, j: 3, weight: 1 },
  { i: 3, j: 0, weight: 1 },
];

const qaoa = createQAOAOptimizer({
  numQubits: 4,
  p: 2,  // Number of QAOA layers
  costHamiltonian: { edges },
  mixer: 'x',
}, simulator);

// Run optimization
const result = await qaoa.optimize(100);

console.log('Optimal solution:', result.optimalSolution);
console.log('Optimal value:', result.optimalValue);
console.log('Convergence:', result.convergence);
```

### Quantum Annealing

```typescript
import { createQuantumAnnealer } from '@summit/quantum-optimization';

const annealer = createQuantumAnnealer();

// Define QUBO problem (minimize energy)
const qubo = [
  [1, -1, 0],
  [-1, 2, -1],
  [0, -1, 1],
];

const result = await annealer.anneal({
  numVars: 3,
  qubo,
}, 10000);

console.log('Solution:', result.solution);
console.log('Energy:', result.energy);
```

### VQE (Variational Quantum Eigensolver)

```typescript
import { createVQESolver } from '@summit/quantum-optimization';

// Define Hamiltonian (e.g., H2 molecule)
const hamiltonian = {
  terms: [
    { coefficient: 0.2, pauliString: 'ZIII' },
    { coefficient: 0.1, pauliString: 'IZII' },
    { coefficient: -0.3, pauliString: 'ZZII' },
    { coefficient: 0.05, pauliString: 'XXII' },
  ],
};

const vqe = createVQESolver({
  numQubits: 4,
  hamiltonian,
  ansatz: 'hardware-efficient',
  layers: 3,
}, simulator);

const result = await vqe.solve(100);

console.log('Ground state energy:', result.groundStateEnergy);
```

---

## Quantum Machine Learning

### Overview

Summit provides quantum machine learning capabilities including quantum kernels, quantum neural networks, and hybrid models.

### Quantum Kernel Methods

```typescript
import { createQuantumKernel } from '@summit/quantum-ml';

const qkernel = createQuantumKernel({
  numQubits: 4,
  featureMap: 'zz',
  reps: 2,
}, simulator);

// Training data
const X = [
  [0.1, 0.2, 0.3, 0.4],
  [0.5, 0.6, 0.7, 0.8],
  [0.9, 1.0, 1.1, 1.2],
];

// Compute kernel matrix for classification
const kernelMatrix = await qkernel.computeKernelMatrix(X);

console.log('Kernel matrix:', kernelMatrix);
```

### Quantum Neural Networks

```typescript
import { createQNN } from '@summit/quantum-ml';

const qnn = createQNN({
  numQubits: 4,
  layers: 3,
  entangling: 'circular',
}, simulator);

// Training data
const X = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]];
const y = [0, 1, 0];  // Binary labels

// Train QNN
await qnn.train(X, y, {
  learningRate: 0.01,
  epochs: 100,
  batchSize: 1,
  optimizer: 'sgd',
});

// Inference
const input = [0.2, 0.3];
const output = await qnn.forward(input);
console.log('QNN output:', output);
```

### Hybrid Quantum-Classical Models

```typescript
import { createHybridModel } from '@summit/quantum-ml';

const hybridModel = createHybridModel({
  quantumParams: {
    numQubits: 4,
    layers: 2,
    entangling: 'linear',
  },
  classicalLayers: [8, 4, 2],  // Classical neural network layers
  activation: 'relu',
}, simulator);

// Training data (multiclass)
const X = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.8]];
const y = [[1, 0], [0, 1], [1, 0], [0, 1]];  // One-hot encoded

await hybridModel.train(X, y, 50, 0.01);

// Prediction
const prediction = await hybridModel.forward([0.25, 0.35]);
console.log('Prediction:', prediction);
```

---

## Hybrid Quantum-Classical Workflows

### Overview

Summit supports hybrid workflows that combine classical preprocessing with quantum subroutines.

### Example: Portfolio Optimization

```typescript
import { createQAOAOptimizer } from '@summit/quantum-optimization';
import { createStatevectorSimulator } from '@summit/quantum-simulation';

async function optimizePortfolio(assets: number[], returns: number[][], riskTolerance: number) {
  // Classical preprocessing: compute covariance matrix
  const covariance = computeCovariance(returns);

  // Convert to QUBO problem
  const qubo = portfolioToQUBO(assets, covariance, riskTolerance);

  // Quantum optimization
  const qaoa = createQAOAOptimizer({
    numQubits: assets.length,
    p: 3,
    costHamiltonian: quboToHamiltonian(qubo),
  }, createStatevectorSimulator());

  const result = await qaoa.optimize(200);

  // Classical postprocessing: validate and refine
  const portfolio = refinePortfolio(result.optimalSolution, assets);

  return portfolio;
}
```

### Example: Drug Discovery

```typescript
async function simulateMolecule(molecule: string) {
  // Classical: Convert molecule to Hamiltonian
  const hamiltonian = moleculeToHamiltonian(molecule);

  // Quantum: Find ground state energy
  const vqe = createVQESolver({
    numQubits: hamiltonian.numQubits,
    hamiltonian,
    ansatz: 'uccsd',
    layers: 2,
  }, simulator);

  const result = await vqe.solve(100);

  // Classical: Analyze results
  const properties = analyzeGroundState(result);

  return properties;
}
```

---

## Cloud Quantum Integration

### Overview

Summit can integrate with cloud quantum computing providers for access to real quantum hardware.

### Supported Providers

- **IBM Quantum** (via Qiskit Runtime)
- **AWS Braket**
- **Azure Quantum**
- **Google Quantum AI** (via Cirq)

### Example: IBM Quantum

```typescript
import { createIBMBackend } from '@summit/quantum-simulation';

const backend = createIBMBackend({
  apiKey: process.env.IBM_QUANTUM_API_KEY!,
  backend: 'ibm_osaka',  // 127-qubit quantum processor
});

// Submit circuit to quantum hardware
const circuit = createCircuit(5)
  .createGHZState([0, 1, 2, 3, 4])
  .measure()
  .build();

const jobId = await backend.submit(circuit);

// Poll for results
while (true) {
  const status = await backend.getStatus(jobId);

  if (status === 'completed') {
    const result = await backend.getResult(jobId);
    console.log('Quantum hardware result:', result.counts);
    break;
  }

  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

---

## Best Practices

### Post-Quantum Cryptography

1. **Use Hybrid Schemes**: Combine classical and quantum algorithms for defense-in-depth
2. **Algorithm Agility**: Design systems to easily swap algorithms
3. **Regular Updates**: Stay current with NIST standards and security advisories
4. **Performance Testing**: Benchmark PQC algorithms in your specific environment
5. **Key Management**: Use robust key lifecycle management

### Quantum Simulation

1. **Qubit Limits**: Stay within simulator limits (typically < 25 qubits)
2. **Circuit Depth**: Minimize circuit depth to reduce simulation time
3. **Shot Count**: Use appropriate shot counts (1024-4096 for most applications)
4. **Validation**: Always validate quantum algorithms with known test cases
5. **Resource Estimation**: Estimate quantum resources before running

### Quantum Optimization

1. **Problem Encoding**: Carefully encode classical problems as quantum problems
2. **Parameter Tuning**: Experiment with QAOA layers, learning rates
3. **Hybrid Approaches**: Use quantum for hard subproblems, classical for rest
4. **Benchmarking**: Compare quantum results with classical solvers
5. **Error Mitigation**: Implement noise mitigation strategies

### Quantum Machine Learning

1. **Data Encoding**: Choose appropriate quantum feature maps
2. **Ansatz Selection**: Match ansatz to problem structure
3. **Classical Baseline**: Always compare with classical ML models
4. **Overtraining**: Watch for overfitting with small quantum models
5. **Hybrid Architecture**: Combine quantum and classical layers strategically

---

## Troubleshooting

### Common Issues

#### Issue: "Circuit too large for simulator"
**Solution**: Reduce number of qubits or use tensor network simulator
```typescript
// Use approximate simulation for large circuits
const backend = createApproximateBackend({ maxQubits: 50 });
```

#### Issue: "PQC key generation is slow"
**Solution**: Use hardware acceleration or lower security level for non-critical applications
```typescript
// Use Level 1 for faster performance
const kem = createKyberKEM(SecurityLevel.LEVEL_1);
```

#### Issue: "QAOA not converging"
**Solution**: Increase layers, adjust learning rate, or try different initialization
```typescript
const qaoa = createQAOAOptimizer({
  numQubits: 6,
  p: 4,  // Increase layers
  // ... other params
}, simulator);
```

#### Issue: "Quantum kernel computation timeout"
**Solution**: Reduce feature map repetitions or use classical kernels for preprocessing
```typescript
const qkernel = createQuantumKernel({
  numQubits: 4,
  featureMap: 'zz',
  reps: 1,  // Reduce from 2 to 1
}, simulator);
```

### Performance Optimization

1. **Caching**: Cache quantum circuit compilations
2. **Batching**: Batch multiple quantum jobs together
3. **Parallel Execution**: Run independent quantum circuits in parallel
4. **Circuit Optimization**: Use circuit optimization passes
5. **Hardware Acceleration**: Leverage GPUs for simulation

### Debugging

Enable debug logging:
```typescript
import { setQuantumLogLevel } from '@summit/quantum-simulation';

setQuantumLogLevel('debug');
```

Visualize circuits:
```typescript
import { visualizeCircuit } from '@summit/quantum-simulation';

const circuit = createCircuit(3).h(0).cnot(0, 1).build();
console.log(visualizeCircuit(circuit));
```

---

## Additional Resources

- [NIST PQC Project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Qiskit Textbook](https://qiskit.org/textbook/)
- [Quantum Computing Report](https://quantumcomputingreport.com/)
- [Summit Quantum API Reference](./API_REFERENCE.md)
- [Summit PQC Migration Roadmap](./PQC_ROADMAP.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-20
**Maintainers**: Quantum Team, Security Team
**Feedback**: quantum-team@summit.ai
