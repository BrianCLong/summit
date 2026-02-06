# Virtual Filesystem (VFS) Architecture

## Overview

The VFS provides an agent-visible filesystem surface that routes path prefixes to pluggable
backends. This keeps agent I/O deterministic, policy-governed, and auditable while allowing
storage to evolve independently. The implementation is clean-room derived from the public
Deep Agents concept and **does not** reuse upstream code; it only mirrors the architectural
idea of prefix routing across backends. The canonical concept reference is the public Deep
Agents materials describing path mounts such as `/docs`, `/memories`, and `/workspace`.

## Core Components

- **VfsRouter**: Resolves absolute paths to the longest-prefix mount, enforces mode and policy,
  and forwards operations to the selected backend.
- **VfsBackend**: Contract for storage backends (local filesystem, in-memory, SQLite, S3, etc.).
- **Policy Hook**: Deny-by-default decision hook that evaluates every operation.

## Tool Surface

The initial tool adapters expose these operations to agents:

- `vfs_ls(path)`
- `vfs_read(path)`
- `vfs_write(path, content)`
- `vfs_edit(path, patch)`
- `vfs_glob(pattern)`
- `vfs_grep(query, root)`

All tools are gated by the router and policy hook. Tool registration remains disabled until
`VFS_ENABLED` is explicitly set to `true` in runtime configuration.

## Mounts & Modes

Mounts define a prefix, backend, and mode:

- `ro`: read-only; write/edit are blocked.
- `rw`: read/write.
- `disabled`: mount exists but denies all operations.

Mounts are evaluated with longest-prefix wins. Paths must be absolute and traversal segments
are rejected (`..`), enforcing a strict path boundary.

## Evidence IDs

The VFS architecture is tracked under these evidence IDs:

- `EVD-DEEPAGENTS-VFS-ARCH-001`
- `EVD-DEEPAGENTS-VFS-SEC-001`
- `EVD-DEEPAGENTS-VFS-EVAL-001`
- `EVD-DEEPAGENTS-VFS-CI-001`

## Observability & Audit

The VFS emits structured audit events (without file contents) containing:

- operation, path, backend ID
- bytes read/written
- decision (allow/deny)
- evidence ID

Never-log fields: **file contents, secrets, credentials, tokens, or PII**.

## Governance Notes

- Deny-by-default is mandatory; allow rules are explicit and mount-scoped.
- The router is the only supported boundary enforcement point for agent file access.
- Evidence artifacts and schema validation are required for GA gating.
