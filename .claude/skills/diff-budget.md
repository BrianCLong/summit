---
name: diff-budget
description: Declare and enforce a diff budget; prevent drive-by edits.
---
When to use:
- Any edit to existing code.

Do:
- Predict touched files and LOC delta
- Declare prohibited changes (formatting/refactors)
- After edits, reconcile actual diff vs budget
- If exceeded: explain why and reduce scope where possible
