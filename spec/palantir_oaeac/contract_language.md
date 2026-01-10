# Action Contract Language

## Goals

- Express preconditions, postconditions, and effect signatures.
- Enable deterministic verification at runtime.

## Contract Example

```yaml
action: link_person_to_org
preconditions:
  - person.exists(person_id)
  - org.exists(org_id)
postconditions:
  - graph.has_edge(person_id, org_id, relationship)
effects:
  - read: [Person, Org]
  - write: [Edge]
```

## Enforcement

- Preconditions validated before policy authorization.
- Effects authorized via policy engine.
- Postconditions validated after state change.

## Auditing

- Emit witness chain entry with contract hash.
- Store contract evaluation result in audit ledger.
