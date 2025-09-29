# Publisher Score

Score = pass rate - penalties + age boost.

- **Pass Rate**: proofsOk / proofsTotal
- **Penalties**: `0.3 * violations30d + 0.2 * refunds30d`
- **Age Boost**: up to +0.1 over first year
- Score clamped to [0,1].

Cooldown applies after auto-unlist to prevent gaming.
