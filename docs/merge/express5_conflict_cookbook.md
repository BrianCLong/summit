# Express 5 Merge: Conflict-Resolution Cookbook

## Golden Rules

1. One global error handler (last); no router-level error handlers.
2. In async handlers: **throw**; never `next(err)` (Express 5 handles promise rejections).
3. Use `res.status(x).json(...)` when you want bodies; reserve `sendStatus()` for bodyless pings.
4. Order: routes → 404 → error handler.
5. Return after responding (avoid “headers already sent”).

## Patterns

### A) Async handler error

**Before**

```ts
router.post("/api/x", async (req,res,next)=>{try{...}catch(e){next(e)}})
```

**After**

```ts
router.post('/api/x', async (req, res) => {
  const r = await svc.create(req.body);
  return res.status(201).json(r);
});
```

### B) Structured errors

```ts
throw Object.assign(new Error("Missing 'type'"), {
  statusCode: 400,
  code: 'BAD_REQUEST',
});
```

Global error handler maps `{ statusCode, code }` → JSON.

### C) 404 + Error order

```ts
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  const s = err.statusCode || 500;
  const c = err.code || 'INTERNAL_ERROR';
  const m =
    process.env.NODE_ENV === 'production'
      ? 'Internal error'
      : err.message || String(err);
  res.status(s).json({ error: { code: c, message: m } });
});
```

### D) Streaming

```ts
import { pipeline } from 'node:stream/promises';
router.get('/export/:id', async (req, res) => {
  const s = await svc.exportStream(req.params.id);
  res.setHeader('Content-Type', 'application/octet-stream');
  await pipeline(s, res);
});
```

### E) Tests

- Use Supertest async/await; expect structured errors.
- Update 404 assertions to JSON.

## Checklists

- [ ] No `next(err)` inside async handlers
- [ ] Exactly one error handler (global, last)
- [ ] 404 precedes error handler
- [ ] `sendStatus()` only when bodyless
- [ ] All routes `return` after sending responses
