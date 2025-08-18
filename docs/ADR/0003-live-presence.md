# ADR 0003: Introduce socket-based presence channel

## Context

Investigators require visibility into who is currently active in a workspace.

## Decision

The realtime server maintains an in-memory map of user presence keyed by `workspaceId`. On connection, sockets join `workspace:{id}` and broadcast a `presence:update` event with the full list of active users. Presence records include `userId`, `username`, `status`, and a server timestamp.

## Consequences

- ✅ Minimal implementation with no additional dependencies.
- ⚠️ Presence state is not persisted; restarting the server clears online lists.
- 🔮 Future enhancement: store presence in Redis to support horizontal scaling.
