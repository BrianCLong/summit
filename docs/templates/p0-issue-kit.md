# P0 UI/UX Issue Kit

**Title (format):** `P0 | [Surface] | [Symptom] | [Client impact]`
Example: `P0 | Tri-pane | Timeline brush desync | Incorrect analysis in demos`

### Impact

- **Who is impacted:** `[role/persona]`
- **What’s blocked:** `[task they can’t complete]`
- **Severity rationale:** `P0 because [revenue/demo/legal/reporting/etc.]`
- **Last known good:** `[date/commit/version if known]`

### Repro (must be deterministic)

- **Env:** `[prod/stage]` **Build:** `[hash/version]` **Browser:** `[Chrome/Edge]`
- **Dataset / case:** `[id or fixture]`
- **Steps:**
  1. …
  2. …
  3. …

- **Expected:** …
- **Actual:** …
- **Repro rate:** `X/10`
- **Video / screenshots:** `[link]`

### Technical signals

- **Console errors:** `[paste]`
- **Network:** `[failed calls / slow endpoints / status codes]`
- **Logs/trace id:** `[id]`
- **Feature flags:** `[on/off]`
- **Timezone / locale:** `[UTC vs local]`

### Success criteria (testable)

- Pane sync correctness (Graph/Timeline/Map): ✅/❌
- Keyboard + screen reader operable: ✅/❌
- No regression in saved views / undo / export: ✅/❌
- Added tests + monitoring: ✅/❌

### Owner checklist (close criteria)

- [ ] Root cause documented in PR
- [ ] Regression tests added
- [ ] QA script included
- [ ] Rollout plan + rollback plan included
- [ ] Post-incident note (what we’ll prevent next)
