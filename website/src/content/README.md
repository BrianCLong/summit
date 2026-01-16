
## Maintaining the GA Page

The `website/src/content/ga.md` page is contract-locked to the claim ledger and evidence index.

**To Update Content:**
1.  Edit `website/src/content/ga.md`.
2.  If you add/change claims, you MUST update `website/src/content/ga.claims.json`.
3.  Every claim requires an existing evidence path in the repo.
4.  Run validation: `pnpm web:ga:validate`.

**Validation Rules:**
- All visible claims must link to a valid Ledger/Evidence ID.
- `ga.claims.json` must exactly match the copy text in `ga.md`.
- `ga.claims.json` must point to valid file paths.
- The Release Status in JSON must match `docs/ga/commanders-go-packet.md`.
