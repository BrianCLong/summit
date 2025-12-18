# @intelgraph/secure-elections

Next-Generation Secure Elections and Digital Democracy Platform for the Summit/IntelGraph ecosystem.

## Features

### 🗳️ Blockchain Ballot Ledger
- Immutable vote recording with SHA-256 hashing
- Merkle tree verification for ballot integrity
- Proof-of-work consensus for block finalization
- Voter-verifiable receipts with merkle proofs
- Full audit trail export capability

### 🔒 Privacy-Preserving AI
- **Differential Privacy**: Laplace noise injection for aggregate statistics
- **Voter Anonymization**: Cryptographic identity separation
- **Zero-Knowledge Proofs**: Eligibility verification without identity disclosure
- **Homomorphic Encryption**: Secure vote tallying (stub implementation)
- **K-Anonymity Checks**: Data release privacy verification

### 📊 Real-Time Results
- Live vote tallying with instant updates
- Precinct-by-precinct reporting
- WebSocket subscription for real-time updates
- Ranked Choice Voting (RCV) tabulation with instant runoff
- Result certification workflow

### 💬 Citizen Deliberation
- Proposal creation and management
- Threaded comment discussions with sentiment tracking
- Deliberation session facilitation
- Participatory budgeting allocation
- AI-powered content moderation

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### Elections
- `POST /api/v1/elections` - Register new election
- `GET /api/v1/elections/:id/results` - Get real-time results
- `POST /api/v1/elections/:id/certify` - Certify final results

### Ballots
- `POST /api/v1/ballots` - Submit encrypted ballot
- `GET /api/v1/ballots/:id/receipt` - Get voter receipt

### Blockchain
- `POST /api/v1/blockchain/mine` - Mine pending ballots
- `GET /api/v1/blockchain/verify` - Verify chain integrity
- `GET /api/v1/blockchain/audit` - Export audit data

### Privacy
- `POST /api/v1/privacy/anonymize` - Anonymize voter identity
- `POST /api/v1/privacy/eligibility-proof` - Generate ZK proof

### Citizen Engagement
- `POST /api/v1/proposals` - Create proposal
- `POST /api/v1/proposals/:id/comments` - Add comment
- `POST /api/v1/proposals/:id/preference` - Record preference
- `POST /api/v1/budget/allocate` - Submit budget allocation

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4020 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `LOG_LEVEL` | info | Pino log level |
| `NODE_ENV` | development | Environment |

## Architecture

```
src/
├── blockchain/
│   └── ballot-ledger.ts      # Immutable vote storage
├── privacy/
│   └── differential-privacy.ts # Privacy-preserving analytics
├── results/
│   └── real-time-aggregator.ts # Live tallying engine
├── feedback/
│   └── citizen-deliberation.ts # Democratic engagement
├── types/
│   ├── election.ts           # Zod schemas
│   └── index.ts              # Type exports
└── index.ts                  # Fastify server
```

## Security Considerations

- All ballots are encrypted before submission
- Voter identity is cryptographically separated from votes
- Chain integrity verified via Merkle proofs
- Content moderation prevents abuse
- Audit trail maintained for transparency

## License

MIT - Part of the Summit/IntelGraph Platform
