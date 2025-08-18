# Live Interfaces

## Presence channel

The realtime socket server exposes a basic presence system. Clients connect to the `/realtime` namespace with a JWT and `workspaceId` in the auth payload. The server tracks active users per workspace and broadcasts `presence:update` events whenever members join, change status, or disconnect.

Each update sends the full list of user presences for that workspace:

```json
[{ "userId": "1", "username": "alice", "status": "online", "ts": 1700000000000 }]
```

Clients can emit `presence:update` with a new status string to change their state.
