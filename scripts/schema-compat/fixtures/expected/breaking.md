# Schema Compatibility Report

Baseline: /workspace/summit/scripts/schema-compat/fixtures/baseline
Current: /workspace/summit/scripts/schema-compat/fixtures/breaking
Breaking changes: 6
Allowed (version bump or map): 0
Unresolved breaking: 6
Additive/Informational: 0

## Unresolved breaking changes

- [breaking] (required.removed) email: Required field "email" was removed or made optional in user.schema.json
- [breaking] (type.narrowed) email: Type for "email" narrowed from string,null to string in user.schema.json
- [breaking] (semantics.changed) email: Semantic tag x-classification changed for "email" (PII -> internal) ({"from":"PII","to":"internal","key":"x-classification"})
- [breaking] (enum.value.removed) status: Enum on "status" removed one or more values in user.schema.json
- [breaking] (type.narrowed) region: Type for "region" narrowed from string,null to string in user.schema.json
- [breaking] (semantics.changed) region: Semantic tag x-classification changed for "region" (sensitive -> public) ({"from":"sensitive","to":"public","key":"x-classification"})

### user.schema.json

**Breaking**

- [breaking] (required.removed) email: Required field "email" was removed or made optional in user.schema.json
- [breaking] (type.narrowed) email: Type for "email" narrowed from string,null to string in user.schema.json
- [breaking] (semantics.changed) email: Semantic tag x-classification changed for "email" (PII -> internal) ({"from":"PII","to":"internal","key":"x-classification"})
- [breaking] (type.narrowed) region: Type for "region" narrowed from string,null to string in user.schema.json
- [breaking] (semantics.changed) region: Semantic tag x-classification changed for "region" (sensitive -> public) ({"from":"sensitive","to":"public","key":"x-classification"})
- [breaking] (enum.value.removed) status: Enum on "status" removed one or more values in user.schema.json
