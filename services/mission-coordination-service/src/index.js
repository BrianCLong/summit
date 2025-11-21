/**
 * Mission Coordination Service
 *
 * Real-time mission execution coordination, monitoring, and control
 * for intelligence operations with live status updates and alerts.
 */

import { OperationsManager } from '@intelgraph/operations-management';
import { CollectionCoordinator } from '@intelgraph/collection-coordination';
import { OperationsCenter } from '@intelgraph/operations-center';

/**
 * Mission Coordination Service
 */
class MissionCoordinationService {
  constructor() {
    this.operations = new OperationsManager();
    this.collection = new CollectionCoordinator();
    this.opsCenter = new OperationsCenter();

    // Active missions tracking
    this.activeMissions = new Map();
    this.executionMonitors = new Map();

    console.log('[COORD] Mission Coordination Service initialized');
  }

  /**
   * Start mission execution
   */
  startMission(missionId) {
    console.log(`[COORD] Starting mission execution: ${missionId}`);

    const mission = this.operations.getMissionPlan(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    // Update mission status
    this.operations.updateMissionPlan(missionId, {
      status: 'ACTIVE'
    });

    // Initialize execution monitor
    const monitor = {
      missionId,
      startTime: new Date().toISOString(),
      status: 'ACTIVE',
      progress: 0,
      milestones: mission.timeline.milestones.map(m => ({
        ...m,
        status: m.completed ? 'COMPLETED' : 'PENDING'
      })),
      issues: [],
      alerts: [],
      metrics: {
        tasksCompleted: 0,
        tasksTotal: 0,
        dataCollected: 0,
        assetsDeployed: 0
      }
    };

    this.executionMonitors.set(missionId, monitor);
    this.activeMissions.set(missionId, mission);

    console.log(`[COORD] Mission ${missionId} execution started`);

    return monitor;
  }

  /**
   * Update mission progress
   */
  updateProgress(missionId, updates) {
    console.log(`[COORD] Updating progress for mission: ${missionId}`);

    const monitor = this.executionMonitors.get(missionId);
    if (!monitor) {
      throw new Error(`No execution monitor for mission ${missionId}`);
    }

    // Update monitor
    Object.assign(monitor, updates);

    // Calculate completion percentage
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      monitor.progress = this.operations.calculateMissionCompletion(missionId);
    }

    // Check for issues and generate alerts
    if (updates.issues && updates.issues.length > 0) {
      this.generateIssueAlerts(missionId, updates.issues);
    }

    console.log(`[COORD] Mission ${missionId} progress: ${monitor.progress.toFixed(1)}%`);

    return monitor;
  }

  /**
   * Monitor collection execution
   */
  monitorCollection(missionId, assetId) {
    console.log(`[COORD] Monitoring collection for mission ${missionId}, asset ${assetId}`);

    const monitor = this.executionMonitors.get(missionId);
    if (!monitor) {
      throw new Error(`No execution monitor for mission ${missionId}`);
    }

    // Get asset tasks
    const tasks = Array.from(this.collection['tasks'].values())
      .filter(t => t.missionId === missionId && t.assetId === assetId);

    // Update metrics
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const totalData = completedTasks.reduce(
      (sum, t) => sum + (t.execution.dataCollected || 0),
      0
    );

    monitor.metrics.tasksCompleted = completedTasks.length;
    monitor.metrics.tasksTotal = tasks.length;
    monitor.metrics.dataCollected = totalData;

    // Check for task failures
    const failedTasks = tasks.filter(t => t.status === 'FAILED');
    if (failedTasks.length > 0) {
      monitor.issues.push({
        type: 'COLLECTION_FAILURE',
        severity: 'HIGH',
        description: `${failedTasks.length} collection tasks failed`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      tasks: tasks.length,
      completed: completedTasks.length,
      failed: failedTasks.length,
      dataCollected: totalData
    };
  }

  /**
   * Generate issue alerts
   */
  generateIssueAlerts(missionId, issues) {
    console.log(`[COORD] Generating alerts for ${issues.length} issues`);

    for (const issue of issues) {
      const event = this.opsCenter.recordEvent({
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ALERT',
        severity: issue.severity || 'MEDIUM',
        priority: 'PRIORITY',
        timestamp: new Date().toISOString(),
        title: `Mission Issue: ${issue.type}`,
        description: issue.description,
        source: 'mission-coordination',
        confidence: 100,
        involvedEntities: [missionId],
        relatedEvents: [],
        classification: 'SECRET',
        caveats: [],
        status: 'NEW',
        metadata: { issue },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`[COORD] Alert created: ${event.id}`);
    }
  }

  /**
   * Complete mission
   */
  completeMission(missionId, summary) {
    console.log(`[COORD] Completing mission: ${missionId}`);

    const monitor = this.executionMonitors.get(missionId);
    if (!monitor) {
      throw new Error(`No execution monitor for mission ${missionId}`);
    }

    // Update mission status
    this.operations.updateMissionPlan(missionId, {
      status: 'COMPLETED'
    });

    // Update monitor
    monitor.status = 'COMPLETED';
    monitor.endTime = new Date().toISOString();
    monitor.progress = 100;
    monitor.summary = summary;

    // Create after-action review
    const aar = this.operations.createAfterActionReview({
      id: `aar-${missionId}`,
      operationId: missionId,
      missionPlanId: missionId,
      execution: {
        startDate: monitor.startTime,
        endDate: monitor.endTime,
        actualDuration: (new Date(monitor.endTime) - new Date(monitor.startTime)) / (1000 * 60 * 60),
        plannedDuration: 24,
        objectives: []
      },
      performance: {
        overall: 'GOOD',
        collection: {
          rating: 'GOOD',
          coverageAchieved: 85,
          qualityScore: 80,
          timeliness: 'ON_TIME'
        },
        analysis: {
          rating: 'GOOD',
          accuracy: 90,
          depth: 'ADEQUATE',
          timelyDelivery: true
        },
        dissemination: {
          rating: 'GOOD',
          reach: 10,
          timeliness: 'ON_TIME',
          feedback: []
        }
      },
      lessonsLearned: [],
      issues: monitor.issues.map(issue => ({
        type: 'OPERATIONAL',
        description: issue.description,
        impact: issue.severity,
        resolution: '',
        preventativeMeasures: []
      })),
      recommendations: [],
      participants: [],
      reviewedBy: 'system',
      reviewDate: new Date().toISOString(),
      approved: false,
      metadata: {}
    });

    console.log(`[COORD] Mission ${missionId} completed, AAR: ${aar.id}`);

    // Remove from active missions
    this.activeMissions.delete(missionId);

    return {
      monitor,
      aar
    };
  }

  /**
   * Get mission status
   */
  getMissionStatus(missionId) {
    const monitor = this.executionMonitors.get(missionId);
    const mission = this.activeMissions.get(missionId);

    if (!monitor) {
      return {
        found: false,
        missionId
      };
    }

    // Get risk assessment
    const risk = mission ? this.operations.assessMissionRisk(missionId) : null;

    return {
      found: true,
      missionId,
      status: monitor.status,
      progress: monitor.progress,
      startTime: monitor.startTime,
      endTime: monitor.endTime,
      metrics: monitor.metrics,
      issues: monitor.issues,
      alerts: monitor.alerts,
      risk,
      milestones: monitor.milestones
    };
  }

  /**
   * Get all active missions
   */
  getActiveMissions() {
    return Array.from(this.activeMissions.keys()).map(missionId => ({
      missionId,
      status: this.getMissionStatus(missionId)
    }));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'mission-coordination',
      status: 'operational',
      activeMissions: this.activeMissions.size,
      executionMonitors: this.executionMonitors.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize service
const service = new MissionCoordinationService();

// Export for testing
export default service;

console.log('[COORD] Mission Coordination Service ready');
console.log('[COORD] Status:', JSON.stringify(service.getStatus(), null, 2));
