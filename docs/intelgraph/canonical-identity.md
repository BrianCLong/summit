# Canonical Identity Strategy

The Canonical Identity Spine is the single architectural decision that determines the scalability of Summit's IntelGraph.

## The Rule
**All graph edges MUST reference canonical IDs only.**

## Impact
By preventing entity duplicates at the relationship level, we avoid the "entity explosion" problem that degrades graph performance and analytical accuracy.

## Components
1. **Identity Resolver**: Service that maps raw ingested signals to canonical IDs.
2. **Merge Engine**: Background process that reconciles and merges duplicate entities.
3. **Identity Metadata**: Traceable history of how a canonical identity was formed.
