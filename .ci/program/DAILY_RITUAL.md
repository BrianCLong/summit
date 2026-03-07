# Daily Ritual

## 15-minute daily

1. **CIWhisperer:** list failing workflows + the first failing step + owner epic
2. **ConflictAuditor:** scan open PRs for directory overlap (block merge if overlap)
3. **Gatekeeper:** ensure every PR description includes:
   - commands run (copy/paste output not required, just list)
   - touched directories

4. **ReleaseCaptain:** maintain a one-screen merge queue:
   - “Docs/tests first”
   - “client next”
   - “policy next”
   - “server modules next”
   - “workflows last”

**Rule:** if CI is red, **stop merging new risk** and merge only doc/test fixes until green.
