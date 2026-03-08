# VM Workbench (clean-room)

Purpose: parse/emit QEMU launch specs and manage VM libraries with policy gates.
Behavioral reference: `vm-curator`.

## Principles
- **Read-only by default**: Discovery and parsing do not mutate the host.
- **Evidence-first**: All operations produce deterministic evidence.
- **Deny-by-default**: Shell expansions and dangerous operations are blocked unless explicitly approved.

## Components
- `spec/`: Canonical JSON schemas for VM specs and hardware.
- `adapters/qemu/`: Restricted parser and emitter for QEMU launch scripts.
- `inventory/`: Abstract hardware inventory interfaces.
- `policy/`: Governance policies for VM operations.
