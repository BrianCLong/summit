import { Server } from 'socket.io';
import {
  IncidentResponseCoordinator,
  CheckInManager,
  ResponseTask,
  TaskStatus,
  TaskPriority,
  TeamAssignment,
} from '@intelgraph/response-coordination';
import { ResourceManager } from '@intelgraph/resource-management';
import {
  MedicalResponseManager,
  TriageCategory,
} from '@intelgraph/medical-response';

export class EmergencyResponseCoordinator {
  private io: Server;
  private responseCoordinator: IncidentResponseCoordinator;
  private checkInManager: CheckInManager;
  private resourceManager: ResourceManager;
  private medicalManager: MedicalResponseManager;

  constructor(io: Server) {
    this.io = io;
    this.responseCoordinator = new IncidentResponseCoordinator();
    this.checkInManager = new CheckInManager();
    this.resourceManager = new ResourceManager();
    this.medicalManager = new MedicalResponseManager();

    this.setupRealtimeUpdates();
  }

  private setupRealtimeUpdates(): void {
    // Subscribe to task updates and broadcast to clients
    // In a real implementation, this would be more sophisticated
  }

  // Task Management
  async createTask(data: {
    incidentId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    assignedBy: string;
    dueDate?: Date;
    location?: any;
  }): Promise<ResponseTask> {
    const task = await this.responseCoordinator.createTask(
      data.incidentId,
      data.title,
      data.description,
      data.priority,
      data.assignedBy,
      {
        dueDate: data.dueDate,
        location: data.location,
      }
    );

    // Broadcast new task to incident room
    this.io.to(`incident:${data.incidentId}`).emit('task-created', task);

    return task;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await this.responseCoordinator.updateTaskStatus(taskId, status);

    // Broadcast status update
    this.io.emit('task-updated', { taskId, status });
  }

  getActiveTasks(): ResponseTask[] {
    return this.responseCoordinator.getActiveTasks();
  }

  // Team Management
  async createTeam(data: {
    name: string;
    type: TeamAssignment['type'];
    leader: string;
    members: string[];
  }): Promise<TeamAssignment> {
    const team = await this.responseCoordinator.createTeam(
      data.name,
      data.type,
      data.leader,
      data.members
    );

    // Broadcast new team
    this.io.emit('team-created', team);

    return team;
  }

  getAvailableTeams(): TeamAssignment[] {
    return this.responseCoordinator.getAvailableTeams();
  }

  // Check-in Management
  async checkIn(data: {
    userId: string;
    location: any;
    status: string;
    role?: any;
  }): Promise<void> {
    await this.checkInManager.checkIn(data.userId, data.location, data.status, data.role);

    // Broadcast check-in
    this.io.emit('personnel-checkin', {
      userId: data.userId,
      status: data.status,
      timestamp: new Date(),
    });
  }

  async checkOut(userId: string): Promise<void> {
    await this.checkInManager.checkOut(userId);

    // Broadcast check-out
    this.io.emit('personnel-checkout', {
      userId,
      timestamp: new Date(),
    });
  }

  getAllCheckedIn() {
    return this.checkInManager.getAllCheckedIn();
  }

  // Medical Triage
  async triageCasualty(data: {
    casualtyId: string;
    category: TriageCategory;
    taggedBy: string;
  }): Promise<void> {
    this.medicalManager.triageCasualty(data.casualtyId, data.category, data.taggedBy);

    // Broadcast triage update
    this.io.emit('casualty-triaged', {
      casualtyId: data.casualtyId,
      category: data.category,
      timestamp: new Date(),
    });
  }

  getCasualties(triageCategory?: string) {
    if (triageCategory) {
      return this.medicalManager.getCasualtiesByTriage(
        triageCategory as TriageCategory
      );
    }
    return this.medicalManager.getMedicalStatistics();
  }

  async dispatchAmbulance(data: {
    ambulanceId: string;
    casualtyId: string;
    destination: string;
  }): Promise<void> {
    this.medicalManager.dispatchAmbulance(
      data.ambulanceId,
      data.casualtyId,
      data.destination
    );

    // Broadcast dispatch
    this.io.emit('ambulance-dispatched', {
      ...data,
      timestamp: new Date(),
    });
  }

  // Real-time Updates
  handleLocationUpdate(data: {
    userId: string;
    location: { latitude: number; longitude: number };
    incidentId: string;
  }): void {
    // Update check-in location
    this.checkInManager.updateStatus(data.userId, 'ACTIVE', data.location);

    // Broadcast to incident room
    this.io.to(`incident:${data.incidentId}`).emit('location-update', {
      userId: data.userId,
      location: data.location,
      timestamp: new Date(),
    });
  }

  handleStatusUpdate(data: {
    userId: string;
    status: string;
    incidentId: string;
  }): void {
    // Update status
    this.checkInManager.updateStatus(data.userId, data.status);

    // Broadcast to incident room
    this.io.to(`incident:${data.incidentId}`).emit('status-update', {
      userId: data.userId,
      status: data.status,
      timestamp: new Date(),
    });
  }

  // Broadcasting helpers
  broadcastToIncident(incidentId: string, event: string, data: any): void {
    this.io.to(`incident:${incidentId}`).emit(event, data);
  }

  broadcastGlobal(event: string, data: any): void {
    this.io.emit(event, data);
  }
}
