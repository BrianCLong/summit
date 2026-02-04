# @intelgraph/context-shell

Summit Context Shell provides a minimal, policy-gated filesystem tool surface for agents.

## Features

- Allowlisted bash-like commands (`pwd`, `ls`, `cat`, `rg`, `find`, `wc`).
- `readFile` and `writeFile` tools with path guardrails.
- Evidence JSONL logging for every tool call.
- Deterministic outputs and caching hooks.

## Usage

```ts
import { createContextShell } from "@intelgraph/context-shell";

const ctx = createContextShell({ root: process.cwd(), fsMode: "readonly" });
const result = await ctx.bash("rg 'policy' docs");
```
