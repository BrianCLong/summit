# Compaction Protocol

## Trigger
Compaction occurs when `token_count > auto_compact_limit`.

## State
- `summary`: Human-readable summary of the conversation.
- `encrypted_content`: Opaque blob containing model-specific latent state.
- `invariant_check`: Boolean flag ensuring critical constraints are preserved.

## Restoration
The next turn starts with the summary and the opaque blob injected as system messages.
