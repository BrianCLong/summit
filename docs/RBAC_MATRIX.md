# API Authorization Matrix

This document is auto-generated. It lists all API endpoints and GraphQL operations with their required permissions.

## GraphQL API

| Type | Field | Required Permission | Status |
|------|-------|---------------------|--------|
| Query | `entity` | `entity:read` | ✅ Enforced |
| Query | `entities` | `entity:read` | ✅ Enforced |
| Query | `relationship` | `relationship:read` | ✅ Enforced |
| Query | `relationships` | `relationship:read` | ✅ Enforced |
| Query | `user` | `user:read` | ✅ Enforced |
| Query | `users` | `user:read` | ✅ Enforced |
| Query | `investigation` | `investigation:read` | ✅ Enforced |
| Query | `investigations` | `investigation:read` | ✅ Enforced |
| Query | `semanticSearch` | `entity:read` | ✅ Enforced |
| Query | `extractEntities` | `ai:request` | ✅ Enforced |
| Query | `analyzeRelationships` | `ai:request` | ✅ Enforced |
| Query | `generateEntityInsights` | `ai:request` | ✅ Enforced |
| Query | `analyzeSentiment` | `ai:request` | ✅ Enforced |
| Query | `getDataQualityInsights` | `ai:request` | ✅ Enforced |
| Query | `graphRagAnswer` | `ai:request` | ✅ Enforced |
| Query | `similarEntities` | `ai:request` | ✅ Enforced |
| Query | `auditTrace` | `audit:read` | ✅ Enforced |
| Query | `supportTicket` | `support:read` | ✅ Enforced |
| Query | `supportTickets` | `support:read` | ✅ Enforced |
| Mutation | `createEntity` | `entity:create` | ✅ Enforced |
| Mutation | `updateEntity` | `entity:update` | ✅ Enforced |
| Mutation | `deleteEntity` | `entity:delete` | ✅ Enforced |
| Mutation | `createRelationship` | `relationship:create` | ✅ Enforced |
| Mutation | `updateRelationship` | `relationship:update` | ✅ Enforced |
| Mutation | `deleteRelationship` | `relationship:delete` | ✅ Enforced |
| Mutation | `createUser` | `user:create` | ✅ Enforced |
| Mutation | `updateUser` | `user:update` | ✅ Enforced |
| Mutation | `updateUserPreferences` | `user:update` | ✅ Enforced |
| Mutation | `deleteUser` | `user:delete` | ✅ Enforced |
| Mutation | `createInvestigation` | `investigation:create` | ✅ Enforced |
| Mutation | `updateInvestigation` | `investigation:update` | ✅ Enforced |
| Mutation | `deleteInvestigation` | `investigation:delete` | ✅ Enforced |
| Mutation | `linkEntities` | `ai:request` | ✅ Enforced |
| Mutation | `extractRelationships` | `ai:request` | ✅ Enforced |
| Mutation | `generateEntitiesFromText` | `ai:request` | ✅ Enforced |
| Mutation | `applyAISuggestions` | `entity:update` | ✅ Enforced |
| Mutation | `enhanceEntitiesWithAI` | `entity:update` | ✅ Enforced |
| Mutation | `clearGraphRAGCache` | `investigation:update` | ✅ Enforced |
| Mutation | `createSupportTicket` | `support:create` | ✅ Enforced |
| Mutation | `updateSupportTicket` | `support:update` | ✅ Enforced |
| Mutation | `deleteSupportTicket` | `support:delete` | ✅ Enforced |
| Mutation | `addSupportTicketComment` | `support:update` | ✅ Enforced |
| Subscription | `entityCreated` | `entity:read` | ✅ Enforced |
| Subscription | `entityUpdated` | `entity:read` | ✅ Enforced |
| Subscription | `entityDeleted` | `entity:read` | ✅ Enforced |
| Subscription | `aiRecommendationUpdated` | `ai:request` | ✅ Enforced |

## Express API Routes

| Method | Path | File | Required Permission | Status |
|--------|------|------|---------------------|--------|
| POST | `/request` | `connectorRoutes.js` | `connector:manage` | ✅ Enforced |
| POST | `/batch` | `connectorRoutes.js` | `connector:manage` | ✅ Enforced |
| GET | `/` | `entities.js` | `entity:create` | ✅ Enforced |
| PATCH | `/:id` | `entities.js` | `entity:update` | ✅ Enforced |
| DELETE | `/:id` | `entities.js` | `entity:delete` | ✅ Enforced |
| POST | `/instances` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| GET | `/instances` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| DELETE | `/instances/:id` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| POST | `/search` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| GET | `/stats` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| GET | `/capabilities` | `federationRoutes.js` | `federation:manage` | ✅ Enforced |
| GET | `/health` | `tracingRoutes.js` | `tracing:read` | ✅ Enforced |
| GET | `/active` | `tracingRoutes.js` | `tracing:read` | ✅ Enforced |
| GET | `/export` | `tracingRoutes.js` | `tracing:manage` | ✅ Enforced |
| GET | `/metrics` | `tracingRoutes.js` | `tracing:manage` | ✅ Enforced |
| POST | `/cleanup` | `tracingRoutes.js` | `tracing:manage` | ✅ Enforced |
| POST | `/` | `warRoomRoutes.js` | `warroom:manage` | ✅ Enforced |
| GET | `/` | `warRoomRoutes.js` | `warroom:manage` | ✅ Enforced |
| POST | `/:id/participants` | `warRoomRoutes.js` | `warroom:manage` | ✅ Enforced |
| DELETE | `/:id/participants/:userId` | `warRoomRoutes.js` | `warroom:manage` | ✅ Enforced |
| GET | `/:id/history` | `warRoomRoutes.js` | `warroom:manage` | ✅ Enforced |
