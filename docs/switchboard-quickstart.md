# Switchboard Consumer Wedge: Quickstart & Demo

Switchboard is the ingestion and routing layer for the Summit platform. This guide provides a quickstart for the "Consumer Wedge" of Switchboard, demonstrating its core capabilities: tool registration, routing, execution, and receipt generation.

## 🚀 One-Command Quickstart

To run the interactive demo, simply execute:

```bash
pnpm demo:switchboard
```

This command boots a minimal Switchboard runtime, registers a sample tool (Calculator), executes a workflow, and generates a cryptographic receipt for each operation.

## 📝 Demo Walkthrough

The demo performs the following steps:

1.  **Boot Runtime**: Initializes an in-memory Switchboard instance with an attached Ledger.
2.  **Register Tool**: Registers a mock "Calculator" tool that supports basic arithmetic.
3.  **Execute Workflow**:
    -   Runs `calculator` with `op: 'add'` (10 + 5).
    -   Runs `calculator` with `op: 'mul'` (10 * 5).
4.  **Generate Receipts**:
    -   Produces a deterministic receipt for each execution using `@summit/receipts`.
    -   Logs the receipt hash and payload.
5.  **Verify Ledger**:
    -   Iterates through the local ledger.
    -   Verifies the cryptographic integrity of each receipt (hash match).

## ✅ Acceptance Criteria

The demo is considered successful if:

-   The command exits with code `0`.
-   Output contains "Switchboard Quickstart Demo".
-   Two receipts are generated and displayed.
-   Ledger verification confirms all receipts are "VALID ✅".

## 🛠 Troubleshooting

If you encounter `ERR_MODULE_NOT_FOUND`, ensure that dependencies are installed via `pnpm install` and that `tsconfig.base.json` includes the correct path mappings for `@summit/receipts` and `@summit/export`.
