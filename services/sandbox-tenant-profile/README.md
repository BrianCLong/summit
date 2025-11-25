# Sandbox Tenant Profile Service

A secure sandbox tenant management service for IntelGraph research and data lab environments.

## Overview

This service provides:

- **Sandbox Profile Management**: Create, configure, and manage sandbox tenant profiles with various isolation levels
- **Policy Enforcement**: Enforce data access policies, connector restrictions, and security boundaries
- **Validation**: Comprehensive validation of sandbox configurations for security compliance
- **Linkback Prevention**: Block and log attempts to link sandbox data back to production

## Features

### Isolation Levels

- **Standard**: Basic VM isolation with synthetic data
- **Enhanced**: Network restrictions and audit logging
- **Airgapped**: No external connectivity, read-only filesystem
- **Research**: Academic/research use with strict anonymization

### Data Access Modes

- **Synthetic Only**: Only synthetic/generated data allowed
- **Anonymized**: De-identified real data
- **Sampled**: Small sample with anonymization
- **Structure Only**: Schema/structure without actual data

### Built-in Presets

- `dataLab`: Data science and analytics work
- `research`: Academic and experimental research
- `demo`: Demonstrations and POCs
- `training`: Onboarding and education
- `airgapped`: High-security isolated environment

## Installation

```bash
pnpm add @intelgraph/sandbox-tenant-profile
```

## Usage

```typescript
import {
  SandboxConfigManager,
  SandboxEnforcer,
  SandboxValidator,
  SandboxIsolationLevel,
} from '@intelgraph/sandbox-tenant-profile';

// Create a sandbox profile
const manager = new SandboxConfigManager();
const profile = await manager.createProfile(
  {
    name: 'Research Sandbox',
    description: 'Data science research environment',
    isolationLevel: SandboxIsolationLevel.RESEARCH,
    expiresInDays: 30,
  },
  'owner-id',
  'dataLab' // preset
);

// Enforce policies
const enforcer = new SandboxEnforcer();
const decision = await enforcer.enforce(profile, {
  sandboxId: profile.id,
  userId: 'user-id',
  operation: 'query',
});

if (!decision.allowed) {
  console.log(`Blocked: ${decision.reason}`);
}

// Validate configuration
const validator = new SandboxValidator();
const report = validator.validate(profile);
console.log(`Valid: ${report.valid}, Findings: ${report.findings.length}`);
```

## API Reference

### SandboxConfigManager

- `createProfile(request, ownerId, preset?)`: Create a new sandbox profile
- `getProfile(sandboxId)`: Get profile by ID
- `updateProfile(sandboxId, request, userId)`: Update profile
- `activateProfile(sandboxId)`: Activate after provisioning
- `suspendProfile(sandboxId, reason)`: Suspend a sandbox
- `archiveProfile(sandboxId)`: Archive a sandbox
- `listProfiles(userId, options?)`: List profiles for user

### SandboxEnforcer

- `enforce(profile, context)`: Make enforcement decision
- `checkLinkback(profile, context, targetId?)`: Check for linkback attempt
- `getDataFilters(profile)`: Get data filters for queries
- `getLinkbackAttempts(sandboxId)`: Get logged linkback attempts

### SandboxValidator

- `validate(profile)`: Validate profile configuration
- `hasErrors(profile)`: Quick check for errors
- `addRule(rule)`: Add custom validation rule

## Testing

```bash
pnpm test
```

## License

MIT
