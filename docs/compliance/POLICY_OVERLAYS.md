# Policy Overlays

Tenant overlays enable deterministic customization of the global policy bundle without mutating the base artifacts. The model introduces explicit patch operations that can be audited, replayed, and layered in a stable order.

## Data model

- **BasePolicyRef**: identifies the base policy bundle (`id`, `version`, optional `source`).
- **PolicyRule**: atomic decision rule with `id`, `effect`, optional `description`, `condition`, and `metadata`.
- **OverlayPatch**: ordered patch instructions with `op` (`override`, `append`, `remove`), `ruleId`, and optional `rule` payload and `note`.
- **TenantOverlayConfig**: tenant-level overlay definition (`tenantId`, `base`, ordered `patches`, optional `metadata`).

## Merge semantics

- Patches are applied in listed order; repeated patches on the same rule are processed sequentially.
- `override`: replaces the matching rule while retaining its original position; if the rule does not exist it is appended deterministically.
- `append`: adds a new rule only if it does not already exist (deduped by `id`), respecting insertion order.
- `remove`: deletes the referenced rule when present.
- The final rule list preserves base order first, followed by appended rules in the order they were introduced.

## Determinism guarantees

- Purely functional merge routine with stable ordering and id-based deduplication.
- No reliance on environment state or clock time.
- Overlay application is repeatable for the same input (validated via unit tests).

## Example

```ts
import mergePolicyOverlay from "../../server/src/policy/overlays/merge.js";
import { TenantOverlayConfig } from "../../server/src/policy/overlays/types.js";

const base = {
  rules: [
    { id: "allow-read", effect: "allow" },
    { id: "deny-delete", effect: "deny" },
  ],
};

const overlay: TenantOverlayConfig = {
  tenantId: "acme",
  base: { id: "global-default", version: "1.0.0" },
  patches: [
    {
      op: "override",
      ruleId: "deny-delete",
      rule: { id: "deny-delete", effect: "deny", description: "Scoped" },
    },
    { op: "append", ruleId: "allow-export", rule: { id: "allow-export", effect: "allow" } },
  ],
};

const merged = mergePolicyOverlay(base, overlay);
console.log(merged.rules);
// [
//   { id: 'allow-read', effect: 'allow' },
//   { id: 'deny-delete', effect: 'deny', description: 'Scoped' },
//   { id: 'allow-export', effect: 'allow' }
// ]
```

## Non-goals

- No runtime OPA wiring or bundle distribution.
- No tenant selection logic or RBAC integration; overlays focus solely on deterministic merge behavior.
