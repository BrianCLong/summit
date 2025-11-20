import {
  MultiSourceEventDetector,
  CrisisAlertGenerator,
  MultiChannelAlertDistributor,
  Alert,
  DetectedEvent,
} from '@intelgraph/crisis-detection';
import { COPManager, GeoSpatialAnalyzer } from '@intelgraph/situational-awareness';
import {
  IncidentCommandSystemManager,
  IncidentResponseCoordinator,
  OperationalPeriodManager,
} from '@intelgraph/response-coordination';
import { ResourceManager } from '@intelgraph/resource-management';
import { EvacuationPlanner } from '@intelgraph/evacuation-planner';
import { MedicalResponseManager } from '@intelgraph/medical-response';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';

interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  crisisType: string;
  severity: string;
  status: 'DRAFT' | 'ACTIVE' | 'STABILIZED' | 'RESOLVED';
  createdAt: Date;
  activatedAt?: Date;
  resolvedAt?: Date;
  createdBy: string;
}

export class CrisisManagementOrchestrator {
  private eventDetector: MultiSourceEventDetector;
  private alertGenerator: CrisisAlertGenerator;
  private alertDistributor: MultiChannelAlertDistributor;
  private copManager: COPManager;
  private spatialAnalyzer: GeoSpatialAnalyzer;
  private icsManager: IncidentCommandSystemManager;
  private responseCoordinator: IncidentResponseCoordinator;
  private operationalPeriodManager: OperationalPeriodManager;
  private resourceManager: ResourceManager;
  private evacuationPlanner: EvacuationPlanner;
  private medicalResponseManager: MedicalResponseManager;

  private incidents: Map<string, Incident> = new Map();
  private alerts: Map<string, Alert> = new Map();

  constructor() {
    // Initialize all managers
    this.eventDetector = new MultiSourceEventDetector();
    this.alertGenerator = new CrisisAlertGenerator();
    this.alertDistributor = new MultiChannelAlertDistributor();
    this.copManager = new COPManager();
    this.spatialAnalyzer = new GeoSpatialAnalyzer();
    this.icsManager = new IncidentCommandSystemManager();
    this.responseCoordinator = new IncidentResponseCoordinator();
    this.operationalPeriodManager = new OperationalPeriodManager();
    this.resourceManager = new ResourceManager();
    this.evacuationPlanner = new EvacuationPlanner();
    this.medicalResponseManager = new MedicalResponseManager();

    logger.info('Crisis Management Orchestrator initialized');
  }

  // Incident Management
  async createIncident(data: {
    tenantId: string;
    title: string;
    description: string;
    crisisType: string;
    severity: string;
    createdBy: string;
  }): Promise<Incident> {
    const incident: Incident = {
      id: randomUUID(),
      ...data,
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.incidents.set(incident.id, incident);
    logger.info(`Created incident ${incident.id}: ${incident.title}`);

    return incident;
  }

  async activateIncident(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.status = 'ACTIVE';
    incident.activatedAt = new Date();

    // Initialize ICS structure
    await this.icsManager.createCommandStructure(incidentId, 'SINGLE_COMMAND');

    // Create Common Operating Picture
    this.copManager.createCOP(
      incident.tenantId,
      incidentId,
      `${incident.title} - COP`
    );

    logger.info(`Activated incident ${incidentId}`);
  }

  async getIncident(incidentId: string): Promise<Incident | undefined> {
    return this.incidents.get(incidentId);
  }

  async getActiveIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(
      (i) => i.status === 'ACTIVE'
    );
  }

  // Event Detection and Alerting
  async detectEvents(): Promise<DetectedEvent[]> {
    try {
      const events = await this.eventDetector.detectAll();
      logger.info(`Detected ${events.length} events`);

      // Generate alerts for significant events
      for (const event of events) {
        if (this.alertGenerator.shouldCreateAlert(event)) {
          const alert = await this.alertGenerator.generateAlert(event);
          this.alerts.set(alert.id, alert);
          await this.alertDistributor.distribute(alert);
        }
      }

      return events;
    } catch (error) {
      logger.error('Error detecting events:', error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      (a) => a.status === 'ACTIVE' || a.status === 'PENDING'
    );
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    logger.info(`Alert ${alertId} acknowledged by ${userId}`);
  }

  // Situational Awareness
  async getCommonOperatingPicture(incidentId: string) {
    const cop = this.copManager.getCOP(incidentId);
    if (!cop) {
      throw new Error(`COP not found for incident: ${incidentId}`);
    }
    return cop;
  }

  // Resource Management
  async getAvailableResources() {
    return {
      personnel: this.resourceManager.getAvailablePersonnel(),
      equipment: this.resourceManager.getAvailableEquipment(),
      vehicles: this.resourceManager.getAvailableVehicles(),
    };
  }

  // Medical Response
  async getMedicalStatistics() {
    return this.medicalResponseManager.getMedicalStatistics();
  }

  // Evacuation
  async getEvacuationProgress() {
    return this.evacuationPlanner.getEvacuationProgress();
  }

  // Dashboard Data
  async getDashboardData() {
    const activeIncidents = await this.getActiveIncidents();
    const activeAlerts = await this.getActiveAlerts();
    const resources = await this.getAvailableResources();
    const medical = await this.getMedicalStatistics();
    const evacuation = await this.getEvacuationProgress();

    return {
      summary: {
        activeIncidents: activeIncidents.length,
        activeAlerts: activeAlerts.length,
        totalAlerts: this.alerts.size,
      },
      incidents: activeIncidents,
      alerts: activeAlerts.slice(0, 10), // Most recent 10
      resources: {
        personnel: resources.personnel.length,
        equipment: resources.equipment.length,
        vehicles: resources.vehicles.length,
      },
      medical,
      evacuation,
      timestamp: new Date(),
    };
  }

  // Automated Response Workflow
  async handleCrisisEvent(event: DetectedEvent): Promise<void> {
    logger.info(`Handling crisis event: ${event.title}`);

    // 1. Create incident
    const incident = await this.createIncident({
      tenantId: event.tenantId,
      title: event.title,
      description: event.description,
      crisisType: event.crisisType,
      severity: event.severity,
      createdBy: 'system',
    });

    // 2. Activate incident if severe
    if (
      event.severity === 'CRITICAL' ||
      event.severity === 'CATASTROPHIC'
    ) {
      await this.activateIncident(incident.id);
    }

    // 3. Generate and distribute alert
    const alert = await this.alertGenerator.generateAlert(event);
    this.alerts.set(alert.id, alert);
    await this.alertDistributor.distribute(alert);

    // 4. Initialize response resources based on crisis type
    await this.initializeResponseResources(incident.id, event.crisisType);

    logger.info(`Crisis event handled: ${event.id}`);
  }

  private async initializeResponseResources(
    incidentId: string,
    crisisType: string
  ): Promise<void> {
    // Different crisis types require different resources
    // This is a simplified example
    switch (crisisType) {
      case 'EARTHQUAKE':
      case 'BUILDING_COLLAPSE':
        // Activate search and rescue teams
        // Alert medical facilities
        break;

      case 'FLOOD':
      case 'HURRICANE':
        // Activate evacuation procedures
        // Alert shelters
        break;

      case 'DISEASE_OUTBREAK':
      case 'PANDEMIC':
        // Alert health departments
        // Activate disease surveillance
        break;

      case 'WILDFIRE':
        // Alert fire departments
        // Activate evacuation zones
        break;

      default:
        logger.warn(`Unknown crisis type: ${crisisType}`);
    }
  }
}
