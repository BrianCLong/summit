### Purpose

Clarify placeholder text and checklist intent across templates. Apply these guidelines when editing PR/release docs.

### Conventions

- Replace `TBD`/`____` with **\[REQUIRED — owner to fill before merge]**
- For checklists, prefix with audience (e.g., **\[Author]**, **\[Reviewer]**, **\[Release Manager]**)
- Add `<!-- why this exists -->` comments inline to teach first‑timers

### Example Snippet

```md
- [ ] **[Author]** Verified threat model updated
<!-- Ensure STRIDE doc reflects new endpoints and data flows. Link to doc. -->
```
