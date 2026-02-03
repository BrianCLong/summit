# VM Workbench Policies

## Launch Script Parsing
- **Forbidden Tokens**: `|`, `&&`, `||`, `$(`, `` ` ``, `>`, `<`.
- **Invariants**:
    - Exactly one `qemu-system-*` invocation allowed.
    - No multi-line scripts.
    - No shell environment expansions.

## Hardware Passthrough
- **Deny-by-default**: Host input devices (keyboards, mice) are blocked from passthrough.
- **Classification**: Devices must be classified before selection.
- **Plan-only**: All passthrough operations must generate a plan and rollback script first.

## Evidence
- Every successful parse must emit `EVD-VMCURATOR-PARSE-001`.
- Every inventory scan must emit `EVD-VMCURATOR-INVENTORY-001`.
