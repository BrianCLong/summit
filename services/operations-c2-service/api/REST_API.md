# Operations C2 Service - REST API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints require authentication via JWT token:
```
Authorization: Bearer <token>
```

## Endpoints

### Mission Operations

#### Create Mission
```http
POST /missions
Content-Type: application/json

{
  "name": "Operation Alpha",
  "classification": "SECRET",
  "type": "COLLECTION",
  "objective": "Collect intelligence on target",
  "priority": "HIGH",
  "timeline": {
    "startDate": "2025-02-01T00:00:00Z",
    "endDate": "2025-02-15T00:00:00Z"
  }
}

Response: 201 Created
{
  "id": "mission-001",
  "name": "Operation Alpha",
  "status": "PLANNING",
  ...
}
```

#### Get Mission
```http
GET /missions/{id}

Response: 200 OK
{
  "id": "mission-001",
  "name": "Operation Alpha",
  "status": "ACTIVE",
  "progress": 45.5,
  ...
}
```

#### List Missions
```http
GET /missions?status=ACTIVE&priority=HIGH

Response: 200 OK
{
  "missions": [
    {
      "id": "mission-001",
      "name": "Operation Alpha",
      ...
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

#### Update Mission
```http
PATCH /missions/{id}
Content-Type: application/json

{
  "status": "ACTIVE",
  "priority": "CRITICAL"
}

Response: 200 OK
{
  "id": "mission-001",
  "status": "ACTIVE",
  ...
}
```

#### Start Mission Execution
```http
POST /missions/{id}/start

Response: 200 OK
{
  "missionId": "mission-001",
  "status": "ACTIVE",
  "startTime": "2025-02-01T00:00:00Z",
  "monitor": {
    "progress": 0,
    "metrics": {...}
  }
}
```

#### Complete Mission
```http
POST /missions/{id}/complete
Content-Type: application/json

{
  "summary": "Mission objectives achieved"
}

Response: 200 OK
{
  "missionId": "mission-001",
  "status": "COMPLETED",
  "aar": {
    "id": "aar-001",
    ...
  }
}
```

### Collection Assets

#### Register Asset
```http
POST /assets
Content-Type: application/json

{
  "name": "Satellite Alpha",
  "type": "SATELLITE",
  "platform": "SATELLITE_LEO",
  "capabilities": {
    "sensors": [...]
  }
}

Response: 201 Created
```

#### Get Available Assets
```http
GET /assets/available?type=SATELLITE&startTime=2025-02-01T00:00:00Z&endTime=2025-02-02T00:00:00Z

Response: 200 OK
{
  "assets": [
    {
      "id": "sat-001",
      "name": "Satellite Alpha",
      "status": "AVAILABLE",
      ...
    }
  ]
}
```

#### Create Collection Task
```http
POST /tasks
Content-Type: application/json

{
  "missionId": "mission-001",
  "assetId": "sat-001",
  "priority": "IMMEDIATE",
  "taskType": "AREA_SEARCH",
  "target": {
    "type": "LOCATION",
    "coordinates": {
      "lat": 35.0,
      "lon": 45.0
    }
  },
  "parameters": {
    "startTime": "2025-02-01T12:00:00Z",
    "endTime": "2025-02-01T18:00:00Z"
  }
}

Response: 201 Created
```

#### Schedule Task
```http
POST /tasks/{taskId}/schedule
Content-Type: application/json

{
  "assetId": "sat-001"
}

Response: 200 OK
{
  "slotId": "slot-001",
  "assetId": "sat-001",
  "taskId": "task-001",
  "startTime": "2025-02-01T12:00:00Z",
  "endTime": "2025-02-01T18:00:00Z"
}
```

### Operations Center

#### Get COP
```http
GET /cop/{id}

Response: 200 OK
{
  "id": "cop-001",
  "name": "Theater COP",
  "layers": [...],
  "updatedAt": "2025-01-20T10:30:00Z"
}
```

#### Update COP
```http
PUT /cop/{id}
Content-Type: application/json

{
  "layers": [...]
}

Response: 200 OK
```

#### Add Entity to COP
```http
POST /cop/{copId}/layers/{layerId}/entities
Content-Type: application/json

{
  "id": "unit-001",
  "type": "UNIT",
  "category": "FRIENDLY",
  "geometry": {
    "type": "Point",
    "coordinates": [-77.0369, 38.9072]
  },
  "properties": {
    "name": "Alpha Company",
    "status": "OPERATIONAL"
  }
}

Response: 201 Created
```

#### Record Event
```http
POST /events
Content-Type: application/json

{
  "type": "DETECTION",
  "severity": "HIGH",
  "priority": "PRIORITY",
  "title": "Unknown activity detected",
  "description": "Unusual pattern detected",
  "source": "sensor-network",
  "confidence": 85
}

Response: 201 Created
{
  "id": "event-001",
  "type": "DETECTION",
  "status": "NEW",
  ...
}
```

#### Get Active Alerts
```http
GET /alerts/active

Response: 200 OK
{
  "alerts": [
    {
      "id": "alert-001",
      "severity": "HIGH",
      "title": "Alert: Unknown activity detected",
      "status": "ACTIVE",
      ...
    }
  ]
}
```

#### Acknowledge Alert
```http
POST /alerts/{id}/acknowledge
Content-Type: application/json

{
  "userId": "user-001"
}

Response: 200 OK
```

### Intelligence Fusion

#### Ingest Report
```http
POST /intelligence/reports
Content-Type: application/json

{
  "discipline": "SIGINT",
  "source": {
    "id": "source-001",
    "type": "SIGNALS_INTERCEPT",
    "reliability": "B",
    "credibility": "2"
  },
  "title": "Communications Intercept",
  "summary": "Command communications detected",
  "classification": "TOP_SECRET",
  "reportDate": "2025-01-20T10:00:00Z",
  "informationDate": "2025-01-20T08:00:00Z",
  "entities": [
    {
      "id": "entity-001",
      "type": "PERSON",
      "name": "Target Alpha",
      "confidence": 90
    }
  ],
  "confidence": 85,
  "priority": "IMMEDIATE"
}

Response: 201 Created
```

#### Find Correlations
```http
GET /intelligence/correlations?timeWindow=24&spatialDistance=10&minScore=60

Response: 200 OK
{
  "correlations": [
    {
      "id": "corr-001",
      "reports": ["report-001", "report-002"],
      "overallScore": 75,
      "type": "CONFIRMATION"
    }
  ]
}
```

#### Create Fused Product
```http
POST /intelligence/fusion
Content-Type: application/json

{
  "reportIds": ["report-001", "report-002", "report-003"],
  "topic": "Multi-INT Assessment"
}

Response: 201 Created
{
  "id": "fused-001",
  "topic": "Multi-INT Assessment",
  "assessment": {
    "conclusion": "...",
    "confidence": 82
  }
}
```

#### Get Entities
```http
GET /intelligence/entities

Response: 200 OK
{
  "entities": [
    {
      "id": "entity-001",
      "canonicalName": "Target Alpha",
      "mentions": [...],
      "resolutionConfidence": 90
    }
  ]
}
```

### Targeting

#### Create Target
```http
POST /targets
Content-Type: application/json

{
  "name": "Command Facility Alpha",
  "category": "HIGH_VALUE",
  "type": "COMMAND_CONTROL",
  "location": {
    "lat": 35.123,
    "lon": 44.567,
    "accuracy": 5
  },
  "significance": "CRITICAL",
  "priority": 1
}

Response: 201 Created
```

#### Create Target Package
```http
POST /targets/{targetId}/packages
Content-Type: application/json

{
  "name": "Package - Command Facility Alpha",
  "weaponeering": {
    "recommendedWeapons": [...]
  },
  "timing": {
    "timeOnTarget": "2025-02-01T06:00:00Z"
  }
}

Response: 201 Created
```

#### Submit Strike Request
```http
POST /strikes
Content-Type: application/json

{
  "targetPackageId": "pkg-001",
  "requestType": "PREPLANNED",
  "execution": {
    "platform": "F-16",
    "callSign": "Viper 1",
    "weapon": "GBU-12",
    "quantity": 2
  },
  "timing": {
    "timeOnTarget": "2025-02-01T06:00:00Z"
  }
}

Response: 201 Created
```

#### Record BDA
```http
POST /strikes/{strikeId}/bda
Content-Type: application/json

{
  "targetId": "target-001",
  "assessment": {
    "physicalDamage": "SEVERE",
    "functionalDamage": "SEVERELY_DEGRADED",
    "percentageDestroyed": 75,
    "confidence": "HIGH"
  },
  "reattack": {
    "required": false
  }
}

Response: 201 Created
```

### Decision Support

#### Create COA
```http
POST /decisions/coas
Content-Type: application/json

{
  "name": "Option 1: Direct Action",
  "description": "Immediate strike on target",
  "operationId": "op-alpha",
  "objectives": [...],
  "resources": {...},
  "timeline": {...}
}

Response: 201 Created
```

#### Compare COAs
```http
POST /decisions/coas/compare
Content-Type: application/json

{
  "coaIds": ["coa-1", "coa-2"],
  "criteria": [
    {
      "name": "Effectiveness",
      "weight": 0.3,
      "scores": {
        "coa-1": 90,
        "coa-2": 70
      }
    }
  ]
}

Response: 200 OK
{
  "id": "comp-001",
  "ranking": [...],
  "recommendation": {
    "recommendedCOA": "coa-1",
    "rationale": "Highest overall score"
  }
}
```

#### Create Risk Assessment
```http
POST /decisions/risk-assessments
Content-Type: application/json

{
  "name": "Operation Alpha Risk Assessment",
  "operationId": "op-alpha",
  "risks": [...]
}

Response: 201 Created
```

#### Generate Executive Briefing
```http
POST /decisions/briefings
Content-Type: application/json

{
  "title": "Operation Alpha - Decision Brief",
  "classification": "SECRET",
  "audience": ["commander"],
  "executiveSummary": "...",
  "situation": {...},
  "options": [...]
}

Response: 201 Created
```

### System

#### Get System Status
```http
GET /system/status

Response: 200 OK
{
  "service": "operations-c2",
  "status": "operational",
  "subsystems": {
    "operations": "ready",
    "collection": "ready",
    "opsCenter": "ready",
    "fusion": "ready",
    "targeting": "ready",
    "decisionSupport": "ready"
  },
  "timestamp": "2025-01-20T12:00:00Z"
}
```

#### Get Health Check
```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "BAD_REQUEST",
  "message": "Invalid input data",
  "details": {
    "field": "priority",
    "issue": "Must be one of: CRITICAL, HIGH, MEDIUM, LOW"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions",
  "required": "SECRET clearance"
}
```

### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found",
  "resource": "mission-999"
}
```

### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req-123"
}
```

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per minute per organization

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## Pagination
List endpoints support pagination:
```http
GET /missions?page=2&pageSize=20
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Filtering
Most list endpoints support filtering:
```http
GET /missions?status=ACTIVE&priority=HIGH&type=COLLECTION
```

## Sorting
```http
GET /missions?sortBy=priority&sortOrder=desc
```

## Field Selection
```http
GET /missions?fields=id,name,status,priority
```

## WebSocket Endpoints

### Real-time Updates
```
ws://localhost:3000/ws
```

Subscribe to updates:
```json
{
  "type": "subscribe",
  "channel": "missions",
  "filter": {
    "missionId": "mission-001"
  }
}
```

Receive updates:
```json
{
  "type": "update",
  "channel": "missions",
  "data": {
    "missionId": "mission-001",
    "status": "ACTIVE",
    "progress": 55.5
  }
}
```

Available channels:
- `missions` - Mission updates
- `events` - Operational events
- `alerts` - Alert notifications
- `cop` - COP updates
- `assets` - Asset status changes
