# Contracts

This directory contains the stable, explicit contract layer for the application. All core services should eventually depend on these interfaces rather than concrete implementations.

## Interfaces

- `ILogger`: Standard logging interface.
- `IConfig`: Configuration access.
- `IEventBus`: Pub/Sub mechanism.
- `IUserStore`: Basic user persistence contract.

## DTOs

Request and Response objects follow a standard envelope format `BaseResponse<T>`.

## Error Handling

Use `ContractError` and `ErrorCode` enum for standardized error reporting across module boundaries.

## Versioning & Migration

1.  **SemVer**: Contracts follow Semantic Versioning. Breaking changes to interfaces require a major version bump.
2.  **Deprecation**: Deprecated members must be marked with `@deprecated` JSDoc and supported for at least one minor version before removal.
3.  **Migration Plan**:
    *   Phase 1: Introduce contracts (Current).
    *   Phase 2: Update service implementations to implement these interfaces.
    *   Phase 3: Update consumers to depend on interfaces (dependency injection).

## Usage

```typescript
import { ILogger, ContractError, ErrorCode } from './contracts';

class MyService {
  constructor(private logger: ILogger) {}

  doWork() {
    try {
      this.logger.info('Working...');
    } catch (e) {
      throw new ContractError('Failed', ErrorCode.INTERNAL_ERROR);
    }
  }
}
```
