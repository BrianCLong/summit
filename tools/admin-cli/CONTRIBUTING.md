# Contributing to Summit Admin CLI

Thank you for your interest in contributing to the Summit Admin CLI! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Architecture Guidelines](#architecture-guidelines)

## Code of Conduct

Please be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.18
- pnpm >= 9.12
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/summit.git
cd summit/tools/admin-cli

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Development Workflow

```bash
# Run CLI in development mode
pnpm dev env status

# Run with watch mode
pnpm dev:watch

# Run specific test file
pnpm test -- output.test.ts

# Run tests with coverage
pnpm test -- --coverage
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-command` - New features
- `fix/auth-token-handling` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/api-client` - Refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat(tenant): add tenant export-metadata command
fix(auth): handle expired token refresh
docs(readme): add configuration examples
```

## Testing

### Test Structure

```
src/__tests__/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests with mock server
└── e2e/           # End-to-end tests (if applicable)
```

### Writing Tests

```typescript
// Unit test example
describe('formatHealthStatus', () => {
  it('should format healthy status with green color', () => {
    const result = formatHealthStatus('healthy');
    expect(result).toContain('healthy');
  });

  it('should format unhealthy status with red color', () => {
    const result = formatHealthStatus('unhealthy');
    expect(result).toContain('unhealthy');
  });
});
```

### Test Coverage

- Aim for 80%+ coverage on new code
- Always test error cases
- Test edge cases and boundary conditions

### Running Tests

```bash
# All tests
pnpm test

# Specific test
pnpm test -- config.test.ts

# With coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add changelog entry
4. Create pull request with clear description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Types updated
```

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested

## Coding Standards

### TypeScript

- Use strict type checking
- Avoid `any` - use `unknown` if needed
- Export types and interfaces
- Use descriptive names

```typescript
// Good
interface TenantCreateOptions {
  name: string;
  adminEmail: string;
  plan?: string;
}

// Avoid
interface Options {
  n: string;
  e: string;
  p?: string;
}
```

### Functions

- Keep functions small and focused
- Use async/await for promises
- Handle errors explicitly
- Document public functions

```typescript
/**
 * Create a new tenant
 * @param options - Tenant creation options
 * @returns Created tenant
 * @throws {ApiError} If tenant creation fails
 */
export async function createTenant(
  options: TenantCreateOptions
): Promise<Tenant> {
  // Implementation
}
```

### Error Handling

```typescript
// Good - explicit error handling
try {
  const result = await apiClient.post('/tenants', data);
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Unknown error');
  }
  return result.data;
} catch (err) {
  logger.error('Failed to create tenant', {
    error: err instanceof Error ? err.message : String(err),
  });
  throw err;
}
```

### Formatting

- Use Prettier for formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas

## Architecture Guidelines

### Command Structure

```
src/commands/<command>.ts
```

Each command file should:
1. Export a `register<Command>Commands` function
2. Use Commander.js for argument parsing
3. Handle errors gracefully
4. Support all output formats

### Adding New Commands

1. Create command file in `src/commands/`
2. Register in `src/commands/index.ts`
3. Add to main CLI in `src/cli.ts`
4. Add tests
5. Update documentation

Example command structure:

```typescript
import { Command } from 'commander';
import type { GlobalOptions } from '../types/index.js';
import { output, printError } from '../utils/output.js';
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';

export function registerMyCommands(program: Command): void {
  const myCmd = new Command('mycommand')
    .description('My command description');

  myCmd
    .command('subcommand')
    .description('Subcommand description')
    .option('-f, --flag', 'Option description')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await executeSubcommand(options, globalOpts);
    });

  program.addCommand(myCmd);
}

async function executeSubcommand(
  options: { flag?: boolean },
  globalOpts: GlobalOptions
): Promise<void> {
  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.get('/my/endpoint');

    if (!response.success) {
      printError(response.error?.message ?? 'Request failed');
      process.exit(1);
    }

    output(response.data);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
```

### API Client Usage

Always use the shared API client:

```typescript
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';

const client = createApiClient({
  endpoint: getEndpoint(options.profile, options.endpoint),
  token: getToken(options.profile, options.token),
});
```

### Output Formatting

Support all output formats:

```typescript
import { output, getOutputFormat } from '../utils/output.js';

// For arrays/objects
output(data);

// For custom formatting
if (getOutputFormat() === 'json') {
  output(data);
} else {
  // Custom table/text output
}
```

### Safety Checks

For destructive operations:

```typescript
import { confirmWithPhrase, CONFIRMATION_PHRASES } from '../utils/confirm.js';

// Always check dry-run first
if (globalOpts.dryRun) {
  printDryRunBanner();
  // Show what would happen
  return;
}

// Require confirmation
const confirmed = await confirmWithPhrase({
  message: 'This will delete all data.',
  requireTypedConfirmation: true,
  typedConfirmationPhrase: CONFIRMATION_PHRASES.DELETE,
});

if (!confirmed) {
  abort();
}
```

## Questions?

- Open an issue for questions
- Join our Discord for discussions
- Email: dev@intelgraph.com
