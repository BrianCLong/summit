# Crisis Management and Emergency Response Platform Guide

## Overview

The Crisis Management and Emergency Response Platform is a comprehensive system for detecting, assessing, responding to, and recovering from crises, emergencies, and critical incidents with real-time situational awareness and coordination.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Packages](#core-packages)
3. [Services](#services)
4. [Getting Started](#getting-started)
5. [Crisis Workflow](#crisis-workflow)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Best Practices](#best-practices)

## Architecture

The platform consists of six core packages and two orchestration services:

### Packages
- `@intelgraph/crisis-detection` - Event monitoring and alerting
- `@intelgraph/situational-awareness` - Real-time mapping and visualization
- `@intelgraph/response-coordination` - ICS support and task management
- `@intelgraph/resource-management` - Personnel and equipment tracking
- `@intelgraph/evacuation-planner` - Evacuation routes and shelter management
- `@intelgraph/medical-response` - Casualty tracking and medical coordination

### Services
- `crisis-management-service` - Central orchestration and incident management
- `emergency-response-service` - Real-time field operations and coordination

## Core Packages

### Crisis Detection (`@intelgraph/crisis-detection`)

Monitors multiple sources for crisis events and generates prioritized alerts.

**Key Features:**
- Multi-source event monitoring (news, social media, sensors, weather)
- Natural disaster detection (earthquakes, hurricanes, floods)
- Man-made incident detection (attacks, accidents, outbreaks)
- Automated alert generation and prioritization
- Anomaly detection for emerging threats
- Multi-channel alert distribution (SMS, email, push, voice)

**Usage Example:**
```typescript
import {
  MultiSourceEventDetector,
  CrisisAlertGenerator,
  MultiChannelAlertDistributor,
  SeismicMonitor,
  WeatherMonitor,
} from '@intelgraph/crisis-detection';

// Initialize detector
const detector = new MultiSourceEventDetector();
detector.addDetector(new SeismicMonitor(config));
detector.addDetector(new WeatherMonitor(config));

// Detect events
const events = await detector.detectAll();

// Generate and distribute alerts
const alertGenerator = new CrisisAlertGenerator();
const distributor = new MultiChannelAlertDistributor();

for (const event of events) {
  if (alertGenerator.shouldCreateAlert(event)) {
    const alert = await alertGenerator.generateAlert(event);
    await distributor.distribute(alert);
  }
}
```

### Situational Awareness (`@intelgraph/situational-awareness`)

Provides real-time incident mapping, visualization, and common operating picture.

**Key Features:**
- Multi-layered geospatial displays
- Asset and resource location tracking
- Personnel and team status monitoring
- Weather and environmental overlays
- Infrastructure and facility status
- Timeline and event chronology tracking

**Usage Example:**
```typescript
import { COPManager, GeoSpatialAnalyzer } from '@intelgraph/situational-awareness';

// Create Common Operating Picture
const copManager = new COPManager();
const cop = copManager.createCOP(tenantId, incidentId, 'Hurricane Response');

// Add timeline event
copManager.addTimelineEvent(cop.id, {
  id: uuid(),
  timestamp: new Date(),
  type: 'ALERT',
  title: 'Hurricane Category upgraded to 5',
  description: 'Hurricane has intensified...',
  severity: SeverityLevel.CRITICAL,
});

// Find nearby assets
const analyzer = new GeoSpatialAnalyzer();
const nearbyAssets = analyzer.findNearbyAssets(location, 5); // 5km radius
```

### Response Coordination (`@intelgraph/response-coordination`)

Implements Incident Command System (ICS) and response task management.

**Key Features:**
- Full ICS organizational structure support
- Response team assignment and dispatch
- Task creation and tracking
- Mutual aid request and coordination
- Multi-agency coordination workflows
- Operational period planning
- After-action review and debriefing

**Usage Example:**
```typescript
import {
  IncidentCommandSystemManager,
  IncidentResponseCoordinator,
  ICSRole,
  CommandStructure,
} from '@intelgraph/response-coordination';

// Create ICS structure
const icsManager = new IncidentCommandSystemManager();
const structure = await icsManager.createCommandStructure(
  incidentId,
  CommandStructure.UNIFIED_COMMAND
);

// Assign positions
await icsManager.assignPosition(
  structure.id,
  ICSRole.INCIDENT_COMMANDER,
  userId
);

// Create and assign tasks
const coordinator = new IncidentResponseCoordinator();
const task = await coordinator.createTask(
  incidentId,
  'Search and Rescue - Zone A',
  'Conduct search operations in flood zone A',
  TaskPriority.CRITICAL,
  commanderId
);

await coordinator.assignTask(task, teamId);
```

### Resource Management (`@intelgraph/resource-management`)

Tracks and allocates personnel, equipment, vehicles, and supplies.

**Key Features:**
- Personnel tracking and availability
- Equipment inventory and deployment
- Vehicle coordination and tracking
- Supply and material management
- Resource request and fulfillment workflow

**Usage Example:**
```typescript
import { ResourceManager, ResourceType } from '@intelgraph/resource-management';

const resourceManager = new ResourceManager();

// Get available personnel with specific specialization
const searchRescue = resourceManager.getAvailablePersonnel('SEARCH_RESCUE');

// Allocate equipment
resourceManager.allocateEquipment(equipmentId, 5, assignmentId);

// Create resource request
const request = resourceManager.createRequest({
  incidentId,
  requestedBy: userId,
  resourceType: ResourceType.VEHICLE,
  description: 'Need 3 ambulances',
  quantity: 3,
  priority: 'CRITICAL',
  status: 'PENDING',
  requestedAt: new Date(),
});
```

### Evacuation Planner (`@intelgraph/evacuation-planner`)

Manages evacuation zones, routes, shelters, and evacuee tracking.

**Key Features:**
- Evacuation zone management
- Route planning and optimization
- Shelter capacity tracking
- Evacuee registration and tracking
- Traffic control coordination
- Reunification support

**Usage Example:**
```typescript
import { EvacuationPlanner, EvacuationZoneType } from '@intelgraph/evacuation-planner';

const planner = new EvacuationPlanner();

// Activate evacuation zone
planner.activateZone(zoneId);

// Register evacuee
planner.registerEvacuee({
  id: uuid(),
  registrationNumber: 'EVA-001234',
  name: 'John Doe',
  householdSize: 4,
  specialNeeds: ['WHEELCHAIR'],
  hasPets: true,
  originAddress: '123 Main St',
  status: 'REGISTERED',
  registeredAt: new Date(),
});

// Find and assign shelter
const shelters = planner.getAvailableShelters(4); // for family of 4
planner.assignShelter(evacueeId, shelters[0].id);

// Get progress
const progress = planner.getEvacuationProgress();
```

### Medical Response (`@intelgraph/medical-response`)

Handles casualty tracking, triage, hospital coordination, and medical supplies.

**Key Features:**
- Casualty estimation and tracking
- Triage and patient tracking (START triage system)
- Hospital capacity and bed availability
- Ambulance and transport coordination
- Medical supply inventory
- Disease outbreak tracking

**Usage Example:**
```typescript
import {
  MedicalResponseManager,
  TriageCategory,
} from '@intelgraph/medical-response';

const medicalManager = new MedicalResponseManager();

// Triage casualty
medicalManager.triageCasualty(casualtyId, TriageCategory.IMMEDIATE, paramedic);

// Get immediate casualties
const immediateCasualties = medicalManager.getCasualtiesByTriage(
  TriageCategory.IMMEDIATE
);

// Find nearest hospital with trauma capability
const hospital = medicalManager.findNearestHospital(location, 'LEVEL_1');

// Dispatch ambulance
medicalManager.dispatchAmbulance(ambulanceId, casualtyId, hospital.id);

// Get statistics
const stats = medicalManager.getMedicalStatistics();
```

## Services

### Crisis Management Service

Central orchestration service that coordinates all crisis management activities.

**Base URL:** `http://localhost:3100`

**Key Endpoints:**

```
POST   /api/v1/incidents          - Create new incident
GET    /api/v1/incidents/:id      - Get incident details
GET    /api/v1/incidents          - List active incidents
PATCH  /api/v1/incidents/:id/activate - Activate incident

GET    /api/v1/alerts             - Get active alerts
PATCH  /api/v1/alerts/:id/acknowledge - Acknowledge alert

GET    /api/v1/incidents/:id/cop  - Get Common Operating Picture
GET    /api/v1/resources/available - Get available resources
GET    /api/v1/medical/statistics - Get medical statistics
GET    /api/v1/evacuation/progress - Get evacuation progress
GET    /api/v1/dashboard          - Get dashboard data
```

### Emergency Response Service

Real-time field operations and response coordination with WebSocket support.

**Base URL:** `http://localhost:3101`

**Key Endpoints:**

```
POST   /api/v1/tasks              - Create task
GET    /api/v1/tasks/active       - Get active tasks
PATCH  /api/v1/tasks/:id/status   - Update task status

POST   /api/v1/teams              - Create team
GET    /api/v1/teams/available    - Get available teams

POST   /api/v1/checkin            - Check in personnel
POST   /api/v1/checkout           - Check out personnel
GET    /api/v1/personnel/status   - Get personnel status

POST   /api/v1/medical/triage     - Triage casualty
GET    /api/v1/medical/casualties - Get casualties
POST   /api/v1/medical/ambulance/dispatch - Dispatch ambulance
```

**WebSocket Events:**

```javascript
// Client connects and joins incident
socket.emit('join-incident', incidentId);

// Location updates
socket.emit('location-update', {
  userId,
  location: { latitude, longitude },
  incidentId,
});

// Status updates
socket.emit('status-update', { userId, status, incidentId });

// Server broadcasts
socket.on('task-created', (task) => { });
socket.on('task-updated', (update) => { });
socket.on('personnel-checkin', (data) => { });
socket.on('location-update', (data) => { });
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm -F @intelgraph/crisis-detection build
pnpm -F @intelgraph/situational-awareness build
pnpm -F @intelgraph/response-coordination build
pnpm -F @intelgraph/resource-management build
pnpm -F @intelgraph/evacuation-planner build
pnpm -F @intelgraph/medical-response build

# Build and start services
cd services/crisis-management-service
pnpm install
pnpm build
pnpm start

cd ../emergency-response-service
pnpm install
pnpm build
pnpm start
```

### Basic Usage

```typescript
import { CrisisManagementOrchestrator } from './orchestrator';

const orchestrator = new CrisisManagementOrchestrator();

// Create and activate incident
const incident = await orchestrator.createIncident({
  tenantId: 'tenant-123',
  title: 'Earthquake - Magnitude 7.2',
  description: 'Major earthquake detected...',
  crisisType: 'EARTHQUAKE',
  severity: 'CRITICAL',
  createdBy: 'system',
});

await orchestrator.activateIncident(incident.id);

// Get dashboard data
const dashboard = await orchestrator.getDashboardData();
```

## Crisis Workflow

### 1. Detection Phase
- Events detected from multiple sources
- Anomaly detection algorithms identify emerging threats
- Threshold monitoring triggers warnings
- Alerts generated and prioritized

### 2. Assessment Phase
- Impact severity scoring
- Population at risk estimation
- Critical infrastructure vulnerability assessment
- Common Operating Picture created

### 3. Response Phase
- ICS structure activated
- Teams assembled and deployed
- Tasks created and assigned
- Resources allocated
- Mutual aid requested if needed

### 4. Operations Phase
- Real-time tracking and coordination
- Situational awareness updates
- Task execution and reporting
- Resource reallocation as needed

### 5. Recovery Phase
- Damage assessment
- Demobilization planning
- After-action review
- Lessons learned captured

## Best Practices

### Incident Command System
1. **Establish Unity of Command** - Clear chain of command prevents confusion
2. **Use Standard Terminology** - Common language across agencies
3. **Manageable Span of Control** - 3-7 resources per supervisor
4. **Modular Organization** - Scale structure based on incident complexity
5. **Common Communications** - Standardized communication protocols

### Alert Management
1. **Prioritize Severity** - Critical alerts take precedence
2. **Deduplicate** - Avoid alert fatigue with intelligent deduplication
3. **Multi-Channel** - Use multiple channels for redundancy
4. **Acknowledge Promptly** - Track and escalate unacknowledged alerts
5. **Clear, Actionable Messages** - Include what, where, when, and what to do

### Resource Management
1. **Track in Real-Time** - Maintain accurate resource status
2. **Stage Strategically** - Pre-position resources near likely needs
3. **Cross-Train Personnel** - Increase flexibility
4. **Maintain Reserves** - Don't commit 100% of resources
5. **Document Everything** - Critical for cost recovery and learning

### Evacuation Planning
1. **Pre-Plan Routes** - Identify primary and alternate routes
2. **Vulnerable Populations First** - Prioritize those with special needs
3. **Clear Communication** - Regular updates to evacuees
4. **Track Everyone** - Registration systems critical for reunification
5. **Pet-Friendly Shelters** - Increases compliance with evacuation orders

### Medical Response
1. **START Triage** - Simple Triage And Rapid Treatment
2. **Track Patients** - Maintain chain of custody
3. **Load Distribution** - Avoid overwhelming single facilities
4. **Supply Tracking** - Monitor critical supplies
5. **Mental Health** - Don't forget psychological first aid

## Troubleshooting

### Common Issues

**Event Detection Not Working**
- Check API credentials for external sources
- Verify network connectivity
- Check polling intervals in configuration

**Alerts Not Distributing**
- Verify channel handler configuration
- Check API keys for SMS/email providers
- Review firewall rules

**Real-time Updates Delayed**
- Check WebSocket connection
- Verify network latency
- Review server load

### Performance Optimization

1. **Database Indexes** - Ensure proper indexing on location and timestamp fields
2. **Caching** - Cache frequently accessed data (hospitals, resources)
3. **Load Balancing** - Distribute load across multiple service instances
4. **Message Queuing** - Use Kafka for high-volume events
5. **Connection Pooling** - Reuse database connections

## Support

For issues, questions, or contributions:
- GitHub Issues: [repository-url]
- Documentation: `/docs/crisis/`
- Emergency Contact: [on-call information]
