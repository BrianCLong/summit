# Incident Command System (ICS) Integration Guide

## Overview

The Crisis Management Platform implements the National Incident Management System (NIMS) Incident Command System (ICS), providing a standardized approach to incident management that is used across all levels of government, non-governmental organizations, and the private sector.

## ICS Structure

### Command Structure Types

The platform supports three command structure types:

#### 1. Single Command
Used when incident is within a single jurisdiction with no overlapping responsibilities.

```typescript
const structure = await icsManager.createCommandStructure(
  incidentId,
  CommandStructure.SINGLE_COMMAND
);
```

#### 2. Unified Command
Used when incidents involve multiple jurisdictions or agencies with overlapping authority and responsibility.

```typescript
const structure = await icsManager.createCommandStructure(
  incidentId,
  CommandStructure.UNIFIED_COMMAND
);

// Multiple incident commanders work together
await icsManager.assignPosition(structure.id, ICSRole.INCIDENT_COMMANDER, fireChiefId);
await icsManager.assignPosition(structure.id, ICSRole.DEPUTY_IC, policeChiefId);
```

#### 3. Area Command
Used when resources must be shared among multiple incidents in the same area.

```typescript
const structure = await icsManager.createCommandStructure(
  incidentId,
  CommandStructure.AREA_COMMAND
);
```

## ICS Positions

### Command Staff

**Incident Commander (IC)**
- Overall authority and responsibility
- Sets incident objectives
- Approves Incident Action Plan (IAP)
- Coordinates with agencies and stakeholders

```typescript
await icsManager.assignPosition(
  structureId,
  ICSRole.INCIDENT_COMMANDER,
  userId
);
```

**Public Information Officer (PIO)**
- Interface with media and public
- Coordinates all information releases
- Manages Joint Information Center (JIC)

**Safety Officer**
- Monitors safety conditions
- Has authority to stop unsafe operations
- Conducts safety briefings

**Liaison Officer**
- Point of contact for assisting agencies
- Maintains list of cooperating and assisting agencies

### General Staff

#### Operations Section Chief
Responsible for all tactical operations to meet incident objectives.

```typescript
await icsManager.assignPosition(
  structureId,
  ICSRole.OPERATIONS_SECTION_CHIEF,
  userId
);

// Expand structure as needed
icsManager.expandStructure(structureId, ICSRole.OPERATIONS_SECTION_CHIEF);
```

**Subordinate Positions:**
- Staging Area Manager
- Branch Directors
- Division/Group Supervisors
- Strike Team/Task Force Leaders

#### Planning Section Chief
Collects, evaluates, and disseminates information. Prepares the Incident Action Plan.

**Subordinate Units:**
- Resources Unit - Tracks all resources
- Situation Unit - Collects and analyzes information
- Documentation Unit - Maintains incident records
- Demobilization Unit - Plans release of resources

#### Logistics Section Chief
Provides resources and services needed to support the incident.

**Subordinate Units:**
- Supply Unit - Orders and receives resources
- Facilities Unit - Provides and maintains facilities
- Ground Support Unit - Manages transportation
- Communications Unit - Manages communications equipment

#### Finance/Administration Section Chief
Monitors costs, provides accounting, and handles compensation/claims.

**Subordinate Units:**
- Time Unit - Tracks personnel time
- Procurement Unit - Manages contracts and financial documents
- Compensation/Claims Unit - Handles injury claims and compensation
- Cost Unit - Tracks incident costs

## Operational Periods

ICS uses operational periods to organize and execute incident operations.

### Creating Operational Periods

```typescript
const period = await operationalPeriodManager.createPeriod(
  incidentId,
  startTime,
  endTime,
  [
    'Contain fire to current perimeter',
    'Complete evacuation of Zone A',
    'Establish medical triage area'
  ],
  [
    'Direct attack on southern flank',
    'Use staging area at high school',
    'Request mutual aid from neighboring counties'
  ],
  incidentCommanderId,
  {
    safetyMessage: 'Watch for falling debris. Wear full PPE at all times.',
    weatherForecast: 'Winds 15-20 mph from SW, no precipitation expected'
  }
);
```

### Typical Operational Period Lengths

- **Initial Period**: Often 12 hours
- **Sustained Operations**: 12-24 hours
- **Complex Incidents**: May be shorter (6-8 hours)
- **Stable Incidents**: May be longer (24-48 hours)

## Forms and Documentation

### ICS Forms Supported

The platform generates and tracks standard ICS forms:

- **ICS 201** - Incident Briefing (Initial response information)
- **ICS 202** - Incident Objectives (Operational period objectives)
- **ICS 203** - Organization Assignment List (ICS positions)
- **ICS 204** - Assignment List (Tactical assignments)
- **ICS 205** - Incident Radio Communications Plan
- **ICS 206** - Medical Plan
- **ICS 207** - Incident Organization Chart
- **ICS 208** - Safety Message/Plan
- **ICS 209** - Incident Status Summary
- **ICS 213** - General Message
- **ICS 214** - Activity Log
- **ICS 215** - Operational Planning Worksheet

## Task Assignment and Tracking

### Creating Tasks

```typescript
const task = await coordinator.createTask(
  incidentId,
  'Search Building 5',
  'Conduct primary search of Building 5, east wing',
  TaskPriority.HIGH,
  operationsSectionChiefId,
  {
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    location: { latitude: 40.7128, longitude: -74.0060 },
    requiredResources: ['USAR_TEAM', 'K9_UNIT']
  }
);
```

### Task Dependencies

Tasks can have dependencies to ensure proper sequencing:

```typescript
const task2 = await coordinator.createTask(
  incidentId,
  'Structural Assessment',
  'Assess structural integrity before interior operations',
  TaskPriority.CRITICAL,
  operationsSectionChiefId
);

const task3 = await coordinator.createTask(
  incidentId,
  'Interior Search',
  'Begin interior search operations',
  TaskPriority.HIGH,
  operationsSectionChiefId,
  {
    dependencies: [task2.id] // Can't start until assessment complete
  }
);

// Check if task can start
const canStart = coordinator.canStartTask(task3.id);
```

## Check-In Process

All personnel must check in when arriving at the incident:

```typescript
await checkInManager.checkIn(
  userId,
  location,
  'AVAILABLE',
  ICSRole.FIREFIGHTER
);

// Update status as assignments change
await checkInManager.updateStatus(userId, 'DEPLOYED', newLocation);

// Check out when leaving
await checkInManager.checkOut(userId);
```

### Why Check-In Matters
1. **Accountability** - Know who is on scene
2. **Resource Tracking** - Manage available resources
3. **Safety** - Account for all personnel
4. **Demobilization** - Track when to release resources

## Span of Control

Maintain manageable span of control (typically 3-7 resources per supervisor, optimally 5).

```typescript
// System warns when span of control exceeded
const position = icsManager.getPosition(structureId, ICSRole.DIVISION_SUPERVISOR);
if (position.subordinates && position.subordinates.length > 7) {
  console.warn('Span of control exceeded - consider expanding structure');
}
```

## Mutual Aid

### Requesting Mutual Aid

```typescript
const request = await mutualAidCoordinator.createRequest(
  incidentId,
  'County Fire Department',
  'State Fire Marshal',
  'TYPE_1_ENGINE',
  3,
  TaskPriority.HIGH,
  new Date(Date.now() + 6 * 60 * 60 * 1000) // Need in 6 hours
);
```

### Tracking Mutual Aid

```typescript
// Approve request
await mutualAidCoordinator.approveRequest(requestId, authorizerUserId);

// Track dispatch
await mutualAidCoordinator.dispatchRequest(requestId);

// Mark arrival
await mutualAidCoordinator.markArrived(requestId);
```

## Unity of Command

Every individual reports to only one supervisor.

```typescript
// The system enforces unity of command
const position = {
  id: uuid(),
  role: ICSRole.STRIKE_TEAM_LEADER,
  assignedTo: userId,
  reportingTo: divisionSupervisorPositionId, // Single supervisor
  responsibilities: ['Lead 5-person strike team', 'Report to Division A Supervisor']
};
```

## Common Communications

### Radio Communication Plan

Establish clear communications plan:

```typescript
const commsPlan = {
  incidentCommandNet: 'Channel 1',
  commandStaffNet: 'Channel 2',
  tacticalNets: {
    divisionA: 'Channel 3',
    divisionB: 'Channel 4',
    medical: 'Channel 5'
  },
  airToGround: 'Channel 6',
  airToAir: 'Channel 7',
  backup: 'Channel 8'
};
```

### Plain Language

Use clear text instead of 10-codes:

```typescript
// Good
const message = 'Fire contained on north side';

// Bad (avoid)
const message = '10-4, 10-75 on north side';
```

## Best Practices

### 1. Initial Response
- Establish command immediately
- Assess situation
- Establish incident objectives
- Determine operational period
- Establish ICS organization appropriate to incident complexity

### 2. Briefings
Hold regular briefings:
- **Shift Change Briefing** - Transfer of command
- **Section/Branch Briefing** - Update on section activities
- **Operational Period Briefing** - IAP presentation
- **Division/Group Briefing** - Tactical assignments

```typescript
await coordinator.addTaskNote(
  taskId,
  userId,
  'Briefing held at 0800. All teams updated on wind shift concerns.'
);
```

### 3. Documentation
Document everything:

```typescript
// Add notes to tasks
await coordinator.addTaskNote(taskId, userId, 'Encountered locked door, bolt cutters needed');

// Status reports
await statusReportManager.createReport(
  incidentId,
  'SITUATION',
  userId,
  {
    fireStatus: 'Contained 40%',
    evacuationStatus: 'Zone A complete, Zone B 60%',
    resourceStatus: 'Adequate for current operations'
  }
);
```

### 4. Transition and Demobilization
Plan for incident closure:

```typescript
// Mark incident transitioning
incident.status = 'TRANSITION';

// Create demobilization plan
const demoUnit = icsManager.getPosition(structureId, ICSRole.DEMOBILIZATION_UNIT_LEADER);

// Release resources in phases
for (const resource of unnecessaryResources) {
  await resourceManager.releaseResource(resource.id);
}
```

## After Action Review

Capture lessons learned:

```typescript
await afterActionManager.addItem(
  incidentId,
  'STRENGTH',
  'Excellent ICS Implementation',
  'Unified command between fire and police worked seamlessly',
  SeverityLevel.INFO,
  userId
);

await afterActionManager.addItem(
  incidentId,
  'AREA_FOR_IMPROVEMENT',
  'Radio Communication Gaps',
  'Communications failed in building basements',
  SeverityLevel.MEDIUM,
  userId
);

await afterActionManager.addItem(
  incidentId,
  'RECOMMENDATION',
  'Upgrade Radio System',
  'Consider portable repeaters for incidents involving basements',
  SeverityLevel.MEDIUM,
  userId
);
```

## Training and Exercises

### Tabletop Exercises

Use the platform for training scenarios:

```typescript
// Create training incident
const trainingIncident = await orchestrator.createIncident({
  tenantId,
  title: '[TRAINING] Chemical Spill Scenario',
  description: 'Tabletop exercise for hazmat response',
  crisisType: 'HAZMAT',
  severity: 'HIGH',
  createdBy: 'training-coordinator'
});
```

### Full-Scale Exercises

Test the entire system:

1. Activate full ICS structure
2. Simulate events and injects
3. Track response times
4. Document decisions
5. Conduct hot wash immediately after
6. Produce formal after-action report

## Integration with External Systems

### CAD (Computer-Aided Dispatch)
```typescript
// Receive incident from CAD
app.post('/api/v1/cad/incident', async (req, res) => {
  const cadIncident = req.body;

  const incident = await orchestrator.createIncident({
    tenantId: cadIncident.agency,
    title: cadIncident.incidentType,
    description: cadIncident.narrative,
    crisisType: mapCADTypeToICS(cadIncident.incidentType),
    severity: mapCADSeverity(cadIncident.priority),
    createdBy: 'cad-system'
  });

  res.json({ incidentId: incident.id });
});
```

### WebEOC
```typescript
// Export to WebEOC format
app.get('/api/v1/incidents/:id/webeoc', async (req, res) => {
  const incident = await orchestrator.getIncident(req.params.id);
  const cop = await orchestrator.getCommonOperatingPicture(req.params.id);

  const webEOCData = formatForWebEOC(incident, cop);
  res.json(webEOCData);
});
```

## Compliance

The platform implements:
- **NIMS Compliance** - Follows NIMS ICS standards
- **FEMA Guidelines** - Adheres to FEMA best practices
- **HSEEP Compliant** - Homeland Security Exercise and Evaluation Program
- **ISO 22320** - Security and resilience — Emergency management

## Summary

The ICS integration provides:

✅ Standardized incident management structure
✅ Clear chain of command
✅ Scalable organization
✅ Unified command for multi-agency incidents
✅ Comprehensive documentation
✅ Resource tracking and accountability
✅ After-action review capabilities

This ensures effective coordination across all responding agencies and organizations.
