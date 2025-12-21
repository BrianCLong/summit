# Beta Strategy & Philosophy

## Intentional Exposure
We are moving away from "Everyone is Beta" to a structured, intentional program.

### Principles
1. **No Global Beta**: Features are never enabled for `*` tenants by default during beta.
2. **Explicit Opt-In**: Tenants must sign the Addendum and be explicitly allowed via Feature Flags.
3. **Controlled Rollout**: Rollouts happen in cohorts (Internal -> Design Partners -> Beta -> GA).

### Transition Plan
1. **Audit**: Identify all currently "open beta" features.
2. **Gate**: Move them behind tenant-allowlist flags.
3. **Migrate**: Contact active users of these features to formalize their beta participation.
4. **Cleanup**: Remove unused flags and dead code.
