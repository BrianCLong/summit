# Retentiond Dashboard

This Next.js dashboard visualises retentiond activity by polling the daemon's metrics endpoints.

## Development

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_RETENTIOND_URL` to point at the retentiond metrics server when running outside of the default `http://localhost:8088`.
