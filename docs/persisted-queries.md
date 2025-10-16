# Persisted Queries — Policy & Runtime

## Policy

- Production GraphQL must only accept requests with `extensions.persistedQuery.sha256Hash` that match `persisted/manifest.json` built at CI.
- Non-persisted queries allowed only in `NODE_ENV!=production` or behind a feature flag.

## Runtime (Node/Apollo example)

```ts
// middleware example (pseudocode)
import manifest from '../persisted/manifest.json';

app.use('/graphql', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const ext = req.body?.extensions?.persistedQuery;
  if (!ext?.sha256Hash)
    return res.status(400).json({ error: 'PersistedQueryRequired' });
  const query = manifest[ext.sha256Hash];
  if (!query) return res.status(400).json({ error: 'UnknownPersistedQuery' });
  req.body.query = query; // inject and continue
  next();
});
```

## Client

- Send `{"extensions":{"persistedQuery":{"version":1,"sha256Hash":"…"}},"variables":{...}}`

## CI

- `persisted-queries.yml` keeps `manifest.json` up to date; attach to release artifacts.
