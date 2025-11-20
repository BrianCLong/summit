---
id: jsdoc-guide
title: JSDoc Documentation Guide
sidebar_label: JSDoc Guide
description: Comprehensive guide for writing JSDoc comments in the IntelGraph codebase
tags: [development, documentation, jsdoc, typescript]
---

# JSDoc Documentation Guide

This guide explains how to write effective JSDoc comments for the IntelGraph platform codebase.

## Why JSDoc?

JSDoc comments provide:
- **IntelliSense**: Better IDE autocompletion and hints
- **Type Safety**: Additional type information for TypeScript
- **API Documentation**: Auto-generated API reference docs
- **Code Understanding**: Self-documenting code for maintainers

## Basic Syntax

### Functions

```typescript
/**
 * Calculate the similarity score between two entities
 *
 * Uses cosine similarity on entity feature vectors to determine how
 * closely related two entities are in the intelligence graph.
 *
 * @param entityA - The first entity to compare
 * @param entityB - The second entity to compare
 * @param options - Optional configuration for similarity calculation
 * @returns Similarity score between 0 and 1, where 1 is identical
 * @throws {ValidationError} If entities are invalid or missing required fields
 *
 * @example
 * ```typescript
 * const score = calculateSimilarity(entity1, entity2, {
 *   algorithm: 'cosine',
 *   threshold: 0.8
 * });
 * ```
 */
export function calculateSimilarity(
  entityA: Entity,
  entityB: Entity,
  options?: SimilarityOptions
): number {
  // Implementation
}
```

### Classes

```typescript
/**
 * GraphRAG Service
 *
 * Implements Retrieval-Augmented Generation over the intelligence graph,
 * combining graph structure with LLM capabilities for enhanced analysis.
 *
 * Features:
 * - Multi-hop graph traversal
 * - Contextual entity retrieval
 * - LLM-powered synthesis
 * - Caching for performance
 *
 * @example
 * ```typescript
 * const graphRAG = new GraphRAGService({
 *   neo4jUri: process.env.NEO4J_URI,
 *   llmProvider: 'anthropic'
 * });
 *
 * const result = await graphRAG.query(
 *   'Find connections between Entity A and Entity B'
 * );
 * ```
 */
export class GraphRAGService {
  /**
   * Initialize GraphRAG service
   *
   * @param config - Service configuration including database and LLM settings
   */
  constructor(private config: GraphRAGConfig) {
    // Implementation
  }

  /**
   * Execute a natural language query against the graph
   *
   * @param query - Natural language question or request
   * @param context - Optional context for query refinement
   * @returns Query results with entities, relationships, and analysis
   * @throws {GraphQueryError} If graph query fails
   * @throws {LLMError} If LLM generation fails
   */
  async query(query: string, context?: QueryContext): Promise<GraphRAGResult> {
    // Implementation
  }
}
```

### Interfaces and Types

```typescript
/**
 * Entity resolution configuration options
 */
export interface EntityResolutionOptions {
  /**
   * Similarity threshold for matching entities (0-1)
   * @default 0.85
   */
  threshold?: number;

  /**
   * Algorithm to use for entity matching
   * @default 'hybrid'
   */
  algorithm?: 'exact' | 'fuzzy' | 'ml' | 'hybrid';

  /**
   * Fields to consider during matching
   * @default ['name', 'identifier']
   */
  matchFields?: string[];

  /**
   * Whether to create new entities for unmatched records
   * @default false
   */
  createNew?: boolean;
}

/**
 * Investigation workflow status
 */
export type InvestigationStatus =
  | 'draft'       // Investigation is being created
  | 'active'      // Investigation is ongoing
  | 'paused'      // Investigation is temporarily paused
  | 'completed'   // Investigation finished successfully
  | 'archived';   // Investigation closed and archived
```

## Required Tags

### @param

Document all function parameters:

```typescript
/**
 * @param userId - Unique identifier for the user (UUID format)
 * @param options - Optional request options
 * @param options.includeDeleted - Whether to include soft-deleted entities
 * @param options.limit - Maximum number of results to return
 */
function getEntitiesByUser(
  userId: string,
  options?: {
    includeDeleted?: boolean;
    limit?: number;
  }
): Promise<Entity[]>
```

### @returns

Document return values:

```typescript
/**
 * @returns Promise resolving to user object, or null if not found
 */
async function findUser(id: string): Promise<User | null>

/**
 * @returns Object containing:
 * - entities: Array of matched entities
 * - confidence: Matching confidence score (0-1)
 * - metadata: Additional matching metadata
 */
function matchEntities(query: string): EntityMatchResult
```

### @throws

Document thrown errors:

```typescript
/**
 * @throws {ValidationError} If input data fails validation
 * @throws {DatabaseError} If database connection fails
 * @throws {AuthorizationError} If user lacks required permissions
 */
async function createInvestigation(data: InvestigationInput): Promise<Investigation>
```

### @example

Provide usage examples:

```typescript
/**
 * @example Basic usage
 * ```typescript
 * const service = new AuthService();
 * const user = await service.login('user@example.com', 'password');
 * ```
 *
 * @example With custom options
 * ```typescript
 * const service = new AuthService({
 *   tokenExpiry: '7d',
 *   refreshTokens: true
 * });
 * ```
 */
```

## Best Practices

### 1. Write for Humans

```typescript
// ❌ Bad: Too technical, unclear
/**
 * Exec async op w/ retry logic
 * @param fn - func
 * @param opts - cfg
 */

// ✅ Good: Clear and descriptive
/**
 * Execute an asynchronous operation with automatic retry logic
 *
 * Retries the operation up to maxRetries times with exponential backoff
 * if it fails with a retryable error.
 *
 * @param fn - The async function to execute
 * @param opts - Configuration for retry behavior
 */
```

### 2. Focus on "Why", Not "What"

```typescript
// ❌ Bad: States the obvious
/**
 * Gets the user
 * @param id - The user ID
 * @returns The user
 */
function getUser(id: string): User

// ✅ Good: Explains purpose and behavior
/**
 * Retrieve user by ID, including related entities and permissions
 *
 * This performs an optimized query that joins user data with their
 * associated roles, investigations, and recent activity.
 *
 * @param id - User UUID
 * @returns User with populated relationships, or null if not found
 */
async function getUser(id: string): Promise<User | null>
```

### 3. Document Edge Cases

```typescript
/**
 * Merge duplicate entities into a single canonical entity
 *
 * The first entity in the array becomes the canonical entity.
 * All relationships from other entities are transferred to it.
 *
 * **Edge Cases**:
 * - If entities have conflicting properties, canonical entity's values take precedence
 * - Relationships between entities being merged are removed to prevent self-loops
 * - Audit trail is maintained for all merged entities
 *
 * @param entities - Array of 2+ entities to merge (first becomes canonical)
 * @returns The merged canonical entity
 * @throws {ValidationError} If fewer than 2 entities provided
 */
```

### 4. Use Inline Links

```typescript
/**
 * Execute a graph traversal query
 *
 * Supports both {@link CypherQuery} and natural language queries.
 * For query optimization tips, see {@link ../guides/query-optimization.md}
 *
 * @param query - Query to execute (see {@link QuerySyntax})
 * @returns Query results with {@link GraphQueryMetadata}
 */
```

### 5. Include Deprecation Notices

```typescript
/**
 * Legacy entity resolution using exact matching
 *
 * @deprecated Since v2.5.0. Use {@link HybridEntityResolutionService} instead.
 * This method will be removed in v3.0.0.
 *
 * Migration guide: {@link ../migration/entity-resolution.md}
 */
export function resolveEntitiesExact(entities: Entity[]): Entity[]
```

## Common Patterns

### Async Operations

```typescript
/**
 * Batch process investigation reports
 *
 * Processes multiple reports concurrently with rate limiting to avoid
 * overwhelming downstream services.
 *
 * @param reports - Array of reports to process
 * @param options - Processing options
 * @returns Promise resolving when all reports are processed
 * @throws {BatchProcessingError} If any reports fail and failFast is true
 *
 * @example
 * ```typescript
 * const results = await batchProcessReports(reports, {
 *   concurrency: 5,
 *   failFast: false,
 *   onProgress: (completed, total) => console.log(`${completed}/${total}`)
 * });
 * ```
 */
async function batchProcessReports(
  reports: Report[],
  options: BatchOptions
): Promise<BatchResult[]>
```

### Event Emitters

```typescript
/**
 * Investigation workflow engine
 *
 * Manages investigation lifecycle and emits events for state changes.
 *
 * Events:
 * - `investigation:created` - New investigation created
 * - `investigation:updated` - Investigation data changed
 * - `investigation:completed` - Investigation finished
 * - `error` - Error occurred during processing
 *
 * @example
 * ```typescript
 * const engine = new InvestigationEngine();
 *
 * engine.on('investigation:created', (investigation) => {
 *   console.log('New investigation:', investigation.id);
 * });
 *
 * engine.on('error', (error) => {
 *   logger.error('Investigation error:', error);
 * });
 * ```
 */
export class InvestigationEngine extends EventEmitter
```

### Generic Types

```typescript
/**
 * Generic repository for database entities
 *
 * Provides CRUD operations for any entity type with type safety.
 *
 * @template T - The entity type this repository manages
 * @template ID - The type of the entity's ID field
 *
 * @example
 * ```typescript
 * const userRepo = new Repository<User, string>(db, 'users');
 * const user = await userRepo.findById('user-123');
 * ```
 */
export class Repository<T extends BaseEntity, ID = string> {
  /**
   * Find entity by ID
   *
   * @param id - Entity identifier
   * @returns Entity if found, null otherwise
   */
  async findById(id: ID): Promise<T | null>
}
```

## Enforcement

### ESLint Configuration

JSDoc rules are enforced via ESLint. Configuration in `eslint-jsdoc.config.mjs`:

```javascript
'jsdoc/require-jsdoc': ['warn', {
  publicOnly: true,
  require: {
    FunctionDeclaration: true,
    MethodDefinition: true,
    ClassDeclaration: true,
  }
}]
```

### Pre-commit Hooks

JSDoc validation runs automatically via Husky pre-commit hooks:

```bash
# Check JSDoc compliance
npm run lint
```

### CI/CD

Documentation quality is checked in CI:

```bash
# In GitHub Actions
npm run lint
npm run docs:generate
npm run docs:validate
```

## Generating Documentation

### TypeDoc

Generate API reference from JSDoc:

```bash
# Generate TypeDoc documentation
npm run docs:generate:sdk

# Output: docs/reference/sdk-js/
```

### Integration with Docusaurus

TypeDoc output is integrated into the Docusaurus site:

```bash
# Build complete documentation site
npm run docs:build

# Includes:
# - Markdown docs
# - TypeDoc API reference
# - OpenAPI specs
```

## Tools and IDE Support

### VS Code

Install recommended extensions:
- **ESLint**: Real-time JSDoc validation
- **TypeScript**: Type checking with JSDoc
- **IntelliSense**: Auto-completion from JSDoc

### WebStorm/IntelliJ

Built-in JSDoc support:
- Hover over symbols to see JSDoc
- Auto-generate JSDoc templates with `/**` + Enter
- Validate JSDoc with inspections

## Migration Guide

### Adding JSDoc to Existing Code

1. **Start with public APIs**: Document exported functions and classes first
2. **Use automation**: Many IDEs can generate JSDoc skeletons
3. **Iterate**: Add examples and improve descriptions over time
4. **Review**: Have peers review JSDoc in code reviews

### Example Migration

```typescript
// Before: No documentation
export function processData(data, options) {
  // ...
}

// After: Full documentation
/**
 * Process raw intelligence data into structured entities
 *
 * Performs data extraction, validation, normalization, and entity
 * resolution on unstructured intelligence data.
 *
 * @param data - Raw data to process (JSON, CSV, or XML format)
 * @param options - Processing configuration
 * @param options.format - Data format: 'json', 'csv', or 'xml'
 * @param options.validate - Whether to perform strict validation
 * @returns Processed entities and relationships
 * @throws {DataValidationError} If data fails validation
 *
 * @example
 * ```typescript
 * const result = await processData(rawJson, {
 *   format: 'json',
 *   validate: true
 * });
 * ```
 */
export async function processData(
  data: string,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  // ...
}
```

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Google JavaScript Style Guide - Comments](https://google.github.io/styleguide/jsguide.html#jsdoc)
- [ESLint JSDoc Plugin](https://github.com/gajus/eslint-plugin-jsdoc)

---

**Next Steps**: [API Documentation Guide](./api-documentation) | [Code Style Guide](./code-style)
