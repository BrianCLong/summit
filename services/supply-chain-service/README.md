# Supply Chain Service

Core orchestration service for supply chain intelligence platform.

## Features

- Supply chain network management
- Network topology analysis
- Visualization graph generation
- Component tracking and availability
- Logistics and shipment tracking
- Critical path analysis
- Dependency mapping
- Geographic distribution analysis

## API Endpoints

### Network & Mapping

- `GET /api/network/topology` - Get network topology analysis
- `GET /api/network/visualization?layout=force` - Get visualization graph
- `POST /api/network/critical-path` - Find critical paths
- `GET /api/network/dependencies/:nodeId` - Analyze node dependencies
- `GET /api/network/geographic` - Get geographic distribution
- `GET /api/dashboard` - Get dashboard overview

### Node Management

- `GET /api/nodes` - List all nodes
- `GET /api/nodes/:id` - Get node by ID
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Relationships

- `GET /api/relationships` - List all relationships
- `POST /api/relationships` - Create relationship

### Components

- `GET /api/components/:id/availability?quantity=100` - Check availability
- `GET /api/components/:id/obsolescence` - Assess obsolescence risk

### Logistics

- `GET /api/shipments/:trackingNumber/track` - Track shipment
- `POST /api/logistics/optimize-route` - Optimize shipping route
- `GET /api/logistics/ports/:portName/congestion` - Monitor port congestion

### Search

- `GET /api/search/nodes?q=acme&type=supplier` - Search nodes

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Environment Variables

- `PORT` - Server port (default: 4020)
- `LOG_LEVEL` - Logging level (default: info)

## License

Proprietary - IntelGraph
