**Mergefix review macro**

- [ ] Async handlers never call `next(err)`
- [ ] Routes → 404 → error handler
- [ ] Structured error shape `{ error: { code, message } }` consistent
- [ ] No router-level error middleware
- [ ] Tests updated for JSON errors & 404s
- [ ] Streaming routes use `pipeline(...)`
