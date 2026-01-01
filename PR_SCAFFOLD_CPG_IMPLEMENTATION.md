# PR: Implement Context Provenance Graph (CPG) System

## Summary

This PR implements the Context Provenance Graph (CPG) system for Model Context Protocols, enabling granular tracking, verification, and policy enforcement over model context at token-range granularity.

## Implementation Details

### New Modules

#### 1. Context Segmentation (`src/context/segmentation.ts`)

- Implements token-range context segmentation
- Assigns cryptographic identifiers to segments
- Maintains source attribution metadata
- Supports multiple segmentation strategies

#### 2. Provenance Graph (`src/context/provenance.ts`)

- Creates directed acyclic graph of context segments
- Tracks derivation and transformation relationships
- Implements cryptographic verification
- Provides graph query capabilities

#### 3. Policy Enforcement (`src/context/policy.ts`)

- Segment-level policy evaluation and enforcement
- Transitive policy constraint propagation
- Revocation and redaction handling
- Integration with existing policy systems

#### 4. Context Replay (`src/context/replay.ts`)

- Historical context reconstruction
- Audit trail generation
- Integrity verification capabilities

### API Changes

#### Context Management API

```typescript
// Context segmentation and management
interface ContextManager {
  segment(context: RawContext): Promise<ContextSegment[]>;
  validateSegment(segment: ContextSegment): boolean;
  updateSegment(segment: ContextSegment): Promise<ContextSegment>;
}

// Provenance graph operations
interface ProvenanceOperations {
  addSegment(segment: ContextSegment): Promise<void>;
  addRelationship(parentId: CID, childId: CID, type: RelationshipType): Promise<void>;
  getDerivations(segmentId: CID): ContextSegment[];
  getDependencies(segmentId: CID): ContextSegment[];
}

// Policy enforcement
interface PolicyEnforcement {
  evaluateSegment(segment: ContextSegment): PolicyDecision;
  enforceSegment(segment: ContextSegment): EnforcedSegment | null;
  revokeSegment(segmentId: CID, reason: RevokeReason): Promise<void>;
}
```

#### Integration Points

- `invariants/context.ts` - Apply invariant constraints to context segments
- `verification/context.ts` - Apply verification to context segments before model execution
- `controller/kill-switch.ts` - Enable context-level kill switches for policy violations

### Documentation Added

- `docs/context-provenance-graph.md` - Comprehensive documentation
- `docs/context-security.md` - Security considerations and best practices
- `docs/context-api.md` - API reference for CPG system

### Tests Added

- `tests/context/segmentation.test.ts` - Unit tests for segmentation
- `tests/context/provenance.test.ts` - Unit tests for provenance graph
- `tests/context/policy.test.ts` - Unit tests for policy enforcement
- `tests/context/integration.test.ts` - Integration tests for complete workflow

### Configuration

- Adds new configuration options for context governance
- New policy settings for context management
- Performance tuning parameters for graph operations

## Breaking Changes

None - all changes are additive and maintain backward compatibility with existing MCP functionality.

## Performance Impact

- Additional overhead for context segmentation and provenance tracking
- Graph operations may impact processing time for complex contexts
- Overall impact should be acceptable given security and governance benefits

## Security Improvements

- Granular context governance with cryptographic verification
- Protection against prompt injection and context manipulation
- Enhanced audit capabilities with complete context lineage tracking
- Selective revocation of context segments without affecting others

## Testing Strategy

- Unit tests for all new components
- Integration tests for end-to-end workflows
- Performance tests for graph operations under load
- Security tests for injection prevention and integrity verification

## Review Checklist

- [ ] All new modules have appropriate unit tests
- [ ] Integration with existing MCP is seamless
- [ ] Performance impact is acceptable
- [ ] Security features are properly implemented
- [ ] Documentation is complete and accurate
- [ ] Backward compatibility is maintained
- [ ] Configuration options are well-documented

This PR establishes the foundational Context Provenance Graph system that enables Summit to treat model context as a governed, provable, and policy-enforceable entity.
