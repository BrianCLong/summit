# Geo-Temporal Analytics API

REST API service for spatial-temporal analytics including trajectory analysis, stay-point detection, co-presence detection, and convoy detection.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start service
pnpm start

# Development mode (watch)
pnpm dev
```

## Configuration

Environment variables:

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
PORT=4100
```

## Endpoints

- `GET /health` - Health check
- `GET /api/geotemporal/entities/:entityId/trajectory` - Get trajectory
- `GET /api/geotemporal/entities/:entityId/trajectory/analysis` - Trajectory with metrics
- `GET /api/geotemporal/entities/:entityId/staypoints` - Detect stay points
- `POST /api/geotemporal/copresence` - Detect co-presence
- `POST /api/geotemporal/convoys` - Detect convoys

## Documentation

See [docs/geotemporal-analytics.md](../../docs/geotemporal-analytics.md) for full documentation.

## Testing

```bash
pnpm test
```

## License

MIT
