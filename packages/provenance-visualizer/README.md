# Provenance Visualizer

React components for visualizing provenance chains, Merkle trees, and chain-of-custody in the IntelGraph platform.

## Features

- **Provenance Chain Viewer**: Visualize claim provenance with transformation history
- **Merkle Tree Viewer**: Interactive Merkle tree visualization with tamper detection
- **Chain of Custody Viewer**: Timeline view of evidence handling and transformations
- **Integrity Verification**: Real-time hash verification and tamper detection
- **Material-UI Components**: Professional, accessible UI components

## Installation

```bash
pnpm add @intelgraph/provenance-visualizer
```

## Usage

### Provenance Chain Viewer

```tsx
import { ProvenanceChainViewer, ProvenanceLedgerClient } from '@intelgraph/provenance-visualizer';

const client = new ProvenanceLedgerClient(
  'http://localhost:4010',
  'analyst-001',
  'investigation review'
);

function App() {
  return (
    <ProvenanceChainViewer
      claimId="claim_550e8400-e29b-41d4-a716-446655440000"
      client={client}
      onVerify={(valid) => console.log('Verified:', valid)}
    />
  );
}
```

### Merkle Tree Viewer

```tsx
import { MerkleTreeViewer, ProvenanceLedgerClient } from '@intelgraph/provenance-visualizer';

const client = new ProvenanceLedgerClient('http://localhost:4010');

function App() {
  return (
    <MerkleTreeViewer
      caseId="case_550e8400-e29b-41d4-a716-446655440000"
      client={client}
      onVerify={(valid, tamperedNodes) => {
        if (!valid) {
          console.log('Tampered nodes:', tamperedNodes);
        }
      }}
    />
  );
}
```

### Chain of Custody Viewer

```tsx
import { ChainOfCustodyViewer, ProvenanceLedgerClient } from '@intelgraph/provenance-visualizer';

const client = new ProvenanceLedgerClient('http://localhost:4010');

function App() {
  return (
    <ChainOfCustodyViewer
      evidenceId="evidence_550e8400-e29b-41d4-a716-446655440000"
      client={client}
    />
  );
}
```

## Components

### ProvenanceChainViewer

Displays a claim's provenance chain with:
- Claim metadata and hash verification
- Step-by-step transformation history
- Source attribution
- Policy labels
- Lineage visualization

**Props:**
- `claimId: string` - Claim ID to visualize
- `client: ProvenanceLedgerClient` - API client instance
- `onVerify?: (valid: boolean) => void` - Callback when verification completes

### MerkleTreeViewer

Interactive Merkle tree visualization with:
- Tree structure visualization
- Node-level tamper detection
- Evidence chain display
- Merkle root verification
- Hash tree integrity checks

**Props:**
- `caseId: string` - Case ID to visualize
- `client: ProvenanceLedgerClient` - API client instance
- `onVerify?: (valid: boolean, tamperedNodes?: string[]) => void` - Callback with verification results

### ChainOfCustodyViewer

Timeline view of evidence handling:
- Evidence metadata
- Transformation history timeline
- Actor attribution
- Policy labels
- Configuration details

**Props:**
- `evidenceId: string` - Evidence ID to visualize
- `client: ProvenanceLedgerClient` - API client instance

## API Client

### ProvenanceLedgerClient

Client for interacting with the prov-ledger service.

```typescript
const client = new ProvenanceLedgerClient(
  baseURL: string,           // e.g., 'http://localhost:4010'
  authorityId?: string,      // Optional authority identifier
  reasonForAccess?: string   // Optional access reason
);

// Methods
await client.getClaim(id: string): Promise<Claim>
await client.getEvidence(id: string): Promise<Evidence>
await client.getProvenanceChain(claimId: string): Promise<ProvenanceChain[]>
await client.getDisclosureBundle(caseId: string): Promise<DisclosureBundle>
await client.verifyHash(content: any, expectedHash: string): Promise<VerificationResult>
await client.exportManifest(): Promise<any>
await client.healthCheck(): Promise<any>
```

## Styling

All components use Material-UI and can be customized with MUI theming:

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ProvenanceChainViewer } from '@intelgraph/provenance-visualizer';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ProvenanceChainViewer {...props} />
    </ThemeProvider>
  );
}
```

## Types

```typescript
interface Claim {
  id: string;
  content: Record<string, any>;
  hash: string;
  signature?: string;
  metadata?: Record<string, any>;
  sourceRef?: string;
  licenseId?: string;
  policyLabels: string[];
  created_at: string;
}

interface Evidence {
  id: string;
  caseId?: string;
  sourceRef: string;
  checksum: string;
  checksumAlgorithm: string;
  contentType?: string;
  fileSize?: number;
  transformChain: TransformStep[];
  licenseId?: string;
  policyLabels: string[];
  authorityId?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface TransformStep {
  transformType: string;
  timestamp: string;
  actorId: string;
  config?: Record<string, any>;
}

interface ProvenanceChain {
  id: string;
  claim_id: string;
  transforms: string[];
  sources: string[];
  lineage: Record<string, any>;
  created_at: string;
}

interface DisclosureBundle {
  caseId: string;
  version: string;
  evidence: Array<{
    id: string;
    sourceRef: string;
    checksum: string;
    transformChain: TransformStep[];
  }>;
  hashTree: string[];
  merkleRoot: string;
  generated_at: string;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Integration Example

Full example integrating all three viewers:

```tsx
import React, { useState } from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import {
  ProvenanceChainViewer,
  MerkleTreeViewer,
  ChainOfCustodyViewer,
  ProvenanceLedgerClient,
} from '@intelgraph/provenance-visualizer';

const client = new ProvenanceLedgerClient(
  process.env.PROV_LEDGER_URL || 'http://localhost:4010',
  'analyst-001',
  'investigation analysis'
);

function ProvenanceApp() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="lg">
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Provenance Chain" />
        <Tab label="Merkle Tree" />
        <Tab label="Chain of Custody" />
      </Tabs>

      <Box mt={3}>
        {tab === 0 && (
          <ProvenanceChainViewer
            claimId="claim_example"
            client={client}
            onVerify={(valid) => {
              if (!valid) alert('Integrity issue detected!');
            }}
          />
        )}
        {tab === 1 && (
          <MerkleTreeViewer
            caseId="case_example"
            client={client}
            onVerify={(valid, tamperedNodes) => {
              if (!valid) {
                console.error('Tampered nodes:', tamperedNodes);
              }
            }}
          />
        )}
        {tab === 2 && (
          <ChainOfCustodyViewer
            evidenceId="evidence_example"
            client={client}
          />
        )}
      </Box>
    </Container>
  );
}
```

## License

Proprietary - IntelGraph Platform
