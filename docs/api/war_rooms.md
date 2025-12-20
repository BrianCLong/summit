# War Rooms API

This document outlines the GraphQL API for creating and managing War Rooms.

## Schema

```graphql
type WarRoom {
  id: ID!
  name: String!
  createdBy: User
  createdAt: String!
  status: String!
  participants: [WarRoomParticipant!]
}

type WarRoomParticipant {
  id: ID!
  user: User!
  role: String!
  joinedAt: String!
}

type User {
  id: ID!
  name: String!
}

enum WarRoomRole {
  ADMIN
  MODERATOR
  PARTICIPANT
}

type Query {
  warRoom(id: ID!): WarRoom
  warRooms: [WarRoom!]
}

type Mutation {
  createWarRoom(name: String!): WarRoom
  addParticipant(warRoomId: ID!, userId: ID!, role: WarRoomRole!): WarRoom
  removeParticipant(warRoomId: ID!, userId: ID!): WarRoom
}
```

## Queries

### `warRoom(id: ID!)`

Fetches a single War Room by its ID.

### `warRooms`

Fetches a list of all active War Rooms.

## Mutations

### `createWarRoom(name: String!)`

Creates a new War Room. The user making the request will be set as the `createdBy` user and an `ADMIN`.

### `addParticipant(warRoomId: ID!, userId: ID!, role: WarRoomRole!)`

Adds a participant to a War Room. This mutation requires the user to be an `ADMIN` of the War Room.

### `removeParticipant(warRoomId: ID!, userId: ID!)`

Removes a participant from a War Room. This mutation requires the user to be an `ADMIN` of the War Room.
