# Live Interfaces

This document outlines the real-time collaboration interfaces for IntelGraph.
It summarizes the presence, graph operations and commenting features that are
exposed over a Socket.IO namespace and consumed by the frontend. The implementation 
is intentionally minimal and intended for extension.

## Socket Namespaces

### `/live` Namespace
- Authenticated via JWT and workspace membership.
- Rooms per workspace allow event fan‑out.
- Supported events:
  - `presence:update` – broadcast user presence updates.
  - `graph:ops` – submit batches of graph operations.
  - `graph:commit` – server broadcast of applied operations.
  - `comment:add` / `comment:new` – post and receive inline comments.

### `/realtime` Namespace (Legacy)
The realtime socket server exposes a basic presence system. Clients connect to the `/realtime` namespace with a JWT and `workspaceId` in the auth payload. The server tracks active users per workspace and broadcasts `presence:update` events whenever members join, change status, or disconnect.

## Presence System

Each update sends the full list of user presences for that workspace:

```json
[{ "userId": "1", "username": "alice", "status": "online", "ts": 1700000000000 }]
```

Clients can emit `presence:update` with a new status string to change their state.

## Client Integration

`useLiveClient(workspaceId, token)` establishes the socket connection and maps
jQuery custom events to the live channel, enabling React components to remain
agnostic of the underlying socket instance.

Future work will add GraphQL subscriptions, RBAC checks, persistence layers and
comprehensive tests to cover conflict resolution, insights and alert streams.
