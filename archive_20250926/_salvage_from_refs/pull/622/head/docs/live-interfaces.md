# Live Interfaces

This document outlines the real-time collaboration interfaces for IntelGraph.
It summarizes the presence, graph operations and commenting features that are
exposed over a Socket.IO namespace at `/live` and consumed by the frontend via
jQuery events. The implementation is intentionally minimal and intended for
extension.

## Socket Namespace `/live`
- Authenticated via JWT and workspace membership.
- Rooms per workspace allow event fan‑out.
- Supported events:
  - `presence:update` – broadcast user presence updates.
  - `graph:ops` – submit batches of graph operations.
  - `graph:commit` – server broadcast of applied operations.
  - `comment:add` / `comment:new` – post and receive inline comments.

## Client Hook
`useLiveClient(workspaceId, token)` establishes the socket connection and maps
jQuery custom events to the live channel, enabling React components to remain
agnostic of the underlying socket instance.

Future work will add GraphQL subscriptions, RBAC checks, persistence layers and
comprehensive tests to cover conflict resolution, insights and alert streams.
