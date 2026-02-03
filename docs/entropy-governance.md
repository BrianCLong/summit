# Entropy Governance Model

## Overview
This document outlines the governance model for fighting architecture drift in Summit.

## Principles
1. **Entropy is inevitable**: We must actively counter it.
2. **Context is key**: Decisions fail when context is missing.
3. **Continuous Enforcement**: Rules must be enforced at build time.

## Roles
- **Platform Architecture**: Owners of `policies/entropy_guard/`.
- **Engineering Teams**: Consumers of context and subject to rules.

## Process
1. New rules start as `warn`.
2. After baseline, rules move to `fail`.
3. Violations require remediation or explicit exception.
