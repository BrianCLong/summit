# Third-Party Influences & Prior Art

This document acknowledges external projects and architectures that influenced the design of Summit's Code Mode.

## Port of Context (pctx)
* **Source**: [GitHub - portofcontext/pctx](https://github.com/portofcontext/pctx)
* **Influence**:
    * "Unified Code Mode" architecture where the agent interacts with a single "executor" tool instead of many granular tools.
    * Concept of wrapping MCP servers into a code execution layer.
    * Security model: keeping auth tokens in the supervisor/proxy, not exposing them to the LLM.
    * Use of "thin signatures" to reduce context usage.
    * `pctx-py-sandbox` for defense-in-depth security testing patterns.

## Cloudflare Code Mode
* **Source**: [Code Mode: the better way to use MCP](https://blog.cloudflare.com/code-mode/)
* **Influence**:
    * Pattern of converting MCP schemas into a TypeScript-like API surface.
    * Sandbox execution model returning logs as output.
    * "Bindings" concept for secrets management (no keys in code).

## License Note
Summit's Code Mode implementation is a clean-room implementation inspired by these architectural patterns. No code was copied from the referenced repositories.
