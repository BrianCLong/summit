# API Compatibility Baselines (N-2)

Place GraphQL introspection baselines here to enable N-2 compatibility checks.

- baseline.N-1.json — Introspection JSON from previous release (N-1)
- baseline.N-2.json — Introspection JSON from two releases back (N-2)

Generate current introspection:

```
cd server && npm run codegen
```

Then run the compatibility check:

```
npm run api:compat
```

If baselines are missing, the check will skip and pass with a note.

