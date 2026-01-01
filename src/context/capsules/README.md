# Invariant-Carrying Context Capsules (IC³) System

The Invariant-Carrying Context Capsules (IC³) system provides a mechanism for embedding machine-verifiable invariants directly into AI context, making context self-defending against rule violations.

## Architecture

The IC³ system consists of three main components:

1. **Context Capsule Generator**: Creates atomic context units with embedded invariants
2. **Invariant Embedder**: Embeds machine-verifiable constraints into context capsules
3. **Invariant Validator**: Validates invariants before model execution

## Core Concepts

### Context Capsules

Context capsules are atomic units of context that contain:

- Executable content (text, structured data, etc.)
- Embedded invariants that constrain usage
- Cryptographic signatures ensuring integrity
- Metadata for source and authority tracking

### Invariants

Invariants are machine-verifiable constraints that specify:

- Permissible reasoning steps
- Data usage restrictions
- Output format requirements
- Authority scope limitations
- Other system-level constraints

### Validation Process

The system validates invariants during the Model Context Protocol (MCP) assembly phase, before model execution:

1. Verify cryptographic signatures of capsules and invariants
2. Execute invariant specifications against content
3. Check for conflicts between multiple invariants
4. Generate enforcement recommendations based on violations

## Usage Examples

### Creating a Context Capsule

```typescript
import { IC3System, ContextContent, InvariantSpec } from "./src/context/capsules";

const ic3 = new IC3System();

const content: ContextContent = {
  type: "text",
  data: "This is context with embedded invariants.",
};

const invariantSpec: InvariantSpec = {
  language: "ic3-text-filter",
  expression: JSON.stringify({
    type: "forbidden-words",
    words: ["inappropriate", "vulgar"],
  }),
};

const capsule = await ic3.createContextCapsule(content, [invariantSpec]);
```

### Validating a Capsule

```typescript
const validationResult = await ic3.validateCapsule(capsule);
if (validationResult.isValid) {
  console.log("Capsule is valid and can be processed");
} else {
  console.log(`Capsule has ${validationResult.violations.length} violations`);
  console.log(`Recommended action: ${validationResult.enforcementRecommendation}`);
}
```

### Creating a Secure Capsule

```typescript
// Creates a capsule with default security invariants
const secureCapsule = await ic3.createSecureCapsule(content);

// Creates a capsule with privacy compliance invariants
const privacyCapsule = await ic3.createPrivacyCompliantCapsule(content);
```

## Invariant Languages

The system supports multiple invariant specification languages:

- `ic3-text-filter`: For text content filtering
- `ic3-data-type`: For data type constraints
- `ic3-size-limit`: For content size limits
- `ic3-token-limit`: For token count constraints
- `ic3-content-pattern`: For content pattern matching

## Enforcement Actions

Based on validation results, the system recommends different enforcement actions:

- `approve`: Context is valid and can be processed normally
- `reject`: Context violates critical invariants and should be rejected
- `quarantine`: Context has violations but may be processed with restrictions
- `audit-only`: Context should be processed but logged for review
- `kill-switch`: Context triggers system-level security measures

## Integration with MCP

The IC³ system integrates with the Model Context Protocol (MCP) to provide pre-execution validation:

1. Context is prepared as capsules with embedded invariants
2. Invariants are validated before model invocation
3. Enforcement actions are applied based on validation results
4. Validated context is passed to the AI model

## Security Considerations

- All invariants are cryptographically bound to content
- Validation occurs before model execution (pre-execution)
- Multiple enforcement levels depending on violation severity
- Support for transitive constraint checking across capsules

## API Reference

### IC3System Class

#### Methods

- `createContextCapsule(content: ContextContent, invariants: InvariantSpec[], authority?: AuthorityLevel): Promise<ContextCapsule>`
  - Creates a new context capsule with specified content and invariant specifications

- `validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult>`
  - Validates a single context capsule against its embedded invariants

- `validateCapsuleSet(capsules: ContextCapsule[]): Promise<CapsuleValidationResult>`
  - Validates a set of context capsules for invariant compliance

- `preExecutionValidation(capsules: ContextCapsule[]): Promise<{ isValid: boolean; action: EnforcementAction; violations: any[] }>`
  - Executes pre-validation before model processing

- `createSecureCapsule(content: ContextContent, authority?: AuthorityLevel): Promise<ContextCapsule>`
  - Creates a context capsule with default security invariants

- `createPrivacyCompliantCapsule(content: ContextContent, authority?: AuthorityLevel): Promise<ContextCapsule>`
  - Creates a context capsule with privacy compliance invariants

### Type Definitions

#### ContextContent

```typescript
interface ContextContent {
  type: "text" | "structured" | "binary" | "embedding";
  data: string | object | Uint8Array;
  format?: string;
  encoding?: string;
}
```

#### InvariantSpec

```typescript
interface InvariantSpec {
  language: string; // Language of the specification
  expression: string; // The actual specification
  parameters?: Record<string, any>; // Additional parameters
}
```

#### CapsuleValidationResult

```typescript
interface CapsuleValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  enforcementRecommendation: EnforcementAction;
  validationTime: Date;
}
```

## Implementation Notes

The IC³ system implements structural enforcement of rules rather than relying on behavioral compliance. Context becomes self-defending by embedding constraints directly into the context structure, enabling proactive rather than reactive security.
