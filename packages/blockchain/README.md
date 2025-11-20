# @intelgraph/blockchain

Private permissioned blockchain infrastructure for immutable audit trails and tamper-proof evidence chains.

## Features

- **Private Permissioned Blockchain**: Controlled access with known validators
- **PBFT Consensus**: Byzantine fault-tolerant consensus mechanism
- **Merkle Tree Verification**: Efficient transaction integrity proofs
- **Hash-Chained Blocks**: Tamper detection through cryptographic linking
- **Transaction Pool**: Mempool for pending transactions
- **Persistent Storage**: LevelDB-backed block storage
- **Proof of Existence**: Generate and verify document proofs

## Installation

```bash
pnpm add @intelgraph/blockchain
```

## Usage

### Initialize Blockchain

```typescript
import { Blockchain, BlockStorage, ConsensusEngine } from '@intelgraph/blockchain';
import pino from 'pino';

const logger = pino();

// Configure blockchain
const config = {
  genesis: {
    chainId: 'intelgraph-main',
    initialValidators: [
      {
        address: 'validator1',
        publicKey: '...',
        votingPower: 1,
        proposerPriority: 0
      }
    ],
    blockTime: 5000,
    maxBlockSize: 1048576,
    consensusAlgorithm: 'pbft',
    networkType: 'private'
  },
  networkId: 'intelgraph',
  enableSharding: false,
  shardCount: 1,
  pruningEnabled: false,
  archiveMode: true
};

// Initialize components
const storage = new BlockStorage('./blockchain-data', logger);
const consensus = new ConsensusEngine(config.genesis, logger);
const blockchain = new Blockchain(config, storage, consensus, logger);

await blockchain.initialize();
```

### Add Transactions

```typescript
const transaction = {
  id: 'tx-123',
  type: 'audit_log',
  timestamp: Date.now(),
  from: 'user-456',
  payload: {
    eventType: 'resource_access',
    action: 'read',
    resourceId: 'doc-789',
    tenantId: 'acme-corp',
    details: { /* ... */ },
    complianceRelevant: true
  },
  signature: '...',
  publicKey: '...',
  nonce: 1
};

await blockchain.addTransaction(transaction);
```

### Generate Proof of Existence

```typescript
const proof = await blockchain.generateProofOfExistence('tx-123');

// Proof includes:
// - Block height and hash
// - Timestamp
// - Merkle proof
console.log(proof);
```

### Verify Proof

```typescript
const isValid = await blockchain.verifyProofOfExistence(proof);
console.log('Proof valid:', isValid);
```

### Query Blockchain

```typescript
// Get block by height
const block = await blockchain.getBlockByHeight(100);

// Get transaction
const tx = await blockchain.getTransaction('tx-123');

// Get current state
const state = blockchain.getState();
console.log('Current height:', state.currentHeight);
```

### Verify Chain Integrity

```typescript
const result = await blockchain.verifyChainIntegrity();

if (result.valid) {
  console.log('Blockchain integrity verified');
} else {
  console.log('Invalid blocks:', result.invalidBlocks);
  console.log('Errors:', result.errors);
}
```

## Architecture

See [docs/blockchain/ARCHITECTURE.md](../../docs/blockchain/ARCHITECTURE.md) for detailed architecture documentation.

## API Reference

### Blockchain

- `initialize()`: Initialize blockchain with genesis block
- `addTransaction(tx)`: Add transaction to pool
- `proposeBlock()`: Propose new block (validators only)
- `addBlock(block)`: Add block to chain
- `getState()`: Get current blockchain state
- `getBlockByHeight(height)`: Get block by height
- `getBlockByHash(hash)`: Get block by hash
- `getTransaction(txId)`: Get transaction by ID
- `generateProofOfExistence(txId)`: Generate proof for transaction
- `verifyProofOfExistence(proof)`: Verify proof
- `verifyChainIntegrity()`: Verify entire chain integrity

### ConsensusEngine

- `startHeight(height)`: Start consensus for new height
- `proposeBlock(block)`: Propose block
- `processPrevote(vote)`: Process prevote
- `processPrecommit(vote)`: Process precommit
- `getState()`: Get consensus state
- `getValidators()`: Get validator set

## License

MIT
