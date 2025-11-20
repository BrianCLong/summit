import {
  ResponseCoordinator,
  ResponseTask,
  TaskStatus,
  TaskPriority,
  TeamAssignment,
  MutualAidRequest,
  OperationalPeriod,
} from './types';
import { randomUUID } from 'crypto';

export class IncidentResponseCoordinator implements ResponseCoordinator {
  private tasks: Map<string, ResponseTask> = new Map();
  private teams: Map<string, TeamAssignment> = new Map();
  private taskAssignments: Map<string, string[]> = new Map(); // taskId -> teamIds
  private taskCallbacks: Map<string, Set<TaskUpdateCallback>> = new Map();

  async createTask(
    incidentId: string,
    title: string,
    description: string,
    priority: TaskPriority,
    assignedBy: string,
    options?: {
      dueDate?: Date;
      location?: any;
      requiredResources?: string[];
      dependencies?: string[];
    }
  ): Promise<ResponseTask> {
    const task: ResponseTask = {
      id: randomUUID(),
      incidentId,
      title,
      description,
      priority,
      status: TaskStatus.PENDING,
      assignedTo: [],
      assignedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: options?.dueDate,
      location: options?.location,
      requiredResources: options?.requiredResources,
      dependencies: options?.dependencies,
      notes: [],
    };

    this.tasks.set(task.id, task);
    this.taskCallbacks.set(task.id, new Set());

    return task;
  }

  async assignTask(task: ResponseTask, teamId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Update task
    task.assignedTo = team.members;
    task.status = TaskStatus.ASSIGNED;
    task.updatedAt = new Date();

    // Update team
    if (!team.assignedTasks.includes(task.id)) {
      team.assignedTasks.push(task.id);
    }

    // Track assignment
    const assignments = this.taskAssignments.get(task.id) || [];
    if (!assignments.includes(teamId)) {
      assignments.push(teamId);
    }
    this.taskAssignments.set(task.id, assignments);

    this.notifyTaskUpdate(task);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    task.updatedAt = new Date();

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
    }

    this.notifyTaskUpdate(task);
  }

  async addTaskNote(taskId: string, author: string, content: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.notes.push({
      author,
      content,
      timestamp: new Date(),
    });

    task.updatedAt = new Date();
    this.notifyTaskUpdate(task);
  }

  getActiveTasks(): ResponseTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) =>
        t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED
    );
  }

  getTasksByIncident(incidentId: string): ResponseTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.incidentId === incidentId
    );
  }

  getTasksByPriority(priority: TaskPriority): ResponseTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.priority === priority);
  }

  getTasksByStatus(status: TaskStatus): ResponseTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  getOverdueTasks(): ResponseTask[] {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(
      (t) =>
        t.dueDate &&
        t.dueDate < now &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED
    );
  }

  getTaskDependencies(taskId: string): ResponseTask[] {
    const task = this.tasks.get(taskId);
    if (!task || !task.dependencies) return [];

    return task.dependencies
      .map((depId) => this.tasks.get(depId))
      .filter((t) => t !== undefined) as ResponseTask[];
  }

  canStartTask(taskId: string): boolean {
    const dependencies = this.getTaskDependencies(taskId);
    return dependencies.every((dep) => dep.status === TaskStatus.COMPLETED);
  }

  subscribeToTaskUpdates(taskId: string, callback: TaskUpdateCallback): () => void {
    let callbacks = this.taskCallbacks.get(taskId);
    if (!callbacks) {
      callbacks = new Set();
      this.taskCallbacks.set(taskId, callbacks);
    }

    callbacks.add(callback);

    return () => {
      callbacks?.delete(callback);
    };
  }

  private notifyTaskUpdate(task: ResponseTask): void {
    const callbacks = this.taskCallbacks.get(task.id);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(task);
        } catch (error) {
          console.error('Error in task update callback:', error);
        }
      });
    }
  }

  // Team Management
  async createTeam(
    name: string,
    type: TeamAssignment['type'],
    leader: string,
    members: string[]
  ): Promise<TeamAssignment> {
    const team: TeamAssignment = {
      id: randomUUID(),
      name,
      type,
      leader,
      members,
      assignedTasks: [],
      status: 'AVAILABLE',
    };

    this.teams.set(team.id, team);
    return team;
  }

  getTeam(teamId: string): TeamAssignment | undefined {
    return this.teams.get(teamId);
  }

  getTeamTasks(teamId: string): ResponseTask[] {
    const team = this.teams.get(teamId);
    if (!team) return [];

    return team.assignedTasks
      .map((taskId) => this.tasks.get(taskId))
      .filter((t) => t !== undefined) as ResponseTask[];
  }

  getAvailableTeams(): TeamAssignment[] {
    return Array.from(this.teams.values()).filter((t) => t.status === 'AVAILABLE');
  }
}

export class MutualAidCoordinator {
  private requests: Map<string, MutualAidRequest> = new Map();

  async createRequest(
    incidentId: string,
    requestingAgency: string,
    requestedFrom: string,
    resourceType: string,
    quantity: number,
    priority: TaskPriority,
    neededBy?: Date
  ): Promise<MutualAidRequest> {
    const request: MutualAidRequest = {
      id: randomUUID(),
      incidentId,
      requestingAgency,
      requestedFrom,
      resourceType,
      quantity,
      priority,
      status: 'PENDING',
      requestedAt: new Date(),
      neededBy,
    };

    this.requests.set(request.id, request);
    return request;
  }

  async approveRequest(
    requestId: string,
    approvedBy: string
  ): Promise<MutualAidRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    request.status = 'APPROVED';
    request.approvedAt = new Date();
    request.approvedBy = approvedBy;

    return request;
  }

  async dispatchRequest(requestId: string): Promise<MutualAidRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    if (request.status !== 'APPROVED') {
      throw new Error('Request must be approved before dispatch');
    }

    request.status = 'DISPATCHED';
    request.deployedAt = new Date();

    return request;
  }

  async markArrived(requestId: string): Promise<MutualAidRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    request.status = 'ARRIVED';
    request.arrivedAt = new Date();

    return request;
  }

  getPendingRequests(): MutualAidRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === 'PENDING'
    );
  }

  getRequestsByIncident(incidentId: string): MutualAidRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.incidentId === incidentId
    );
  }
}

export class OperationalPeriodManager {
  private periods: Map<string, OperationalPeriod> = new Map();
  private incidentPeriods: Map<string, string[]> = new Map(); // incidentId -> periodIds

  async createPeriod(
    incidentId: string,
    startTime: Date,
    endTime: Date,
    objectives: string[],
    strategies: string[],
    approvedBy: string,
    options?: {
      safetyMessage?: string;
      weatherForecast?: string;
    }
  ): Promise<OperationalPeriod> {
    const incidentPeriodIds = this.incidentPeriods.get(incidentId) || [];
    const periodNumber = incidentPeriodIds.length + 1;

    const period: OperationalPeriod = {
      id: randomUUID(),
      incidentId,
      periodNumber,
      startTime,
      endTime,
      objectives,
      strategies,
      safetyMessage: options?.safetyMessage,
      weatherForecast: options?.weatherForecast,
      approvedBy,
      approvedAt: new Date(),
    };

    this.periods.set(period.id, period);

    incidentPeriodIds.push(period.id);
    this.incidentPeriods.set(incidentId, incidentPeriodIds);

    return period;
  }

  getCurrentPeriod(incidentId: string): OperationalPeriod | undefined {
    const periodIds = this.incidentPeriods.get(incidentId);
    if (!periodIds || periodIds.length === 0) return undefined;

    const now = new Date();
    const currentPeriods = periodIds
      .map((id) => this.periods.get(id))
      .filter((p) => p && p.startTime <= now && p.endTime >= now) as OperationalPeriod[];

    return currentPeriods[0];
  }

  getPeriodsByIncident(incidentId: string): OperationalPeriod[] {
    const periodIds = this.incidentPeriods.get(incidentId) || [];
    return periodIds
      .map((id) => this.periods.get(id))
      .filter((p) => p !== undefined) as OperationalPeriod[];
  }
}

type TaskUpdateCallback = (task: ResponseTask) => void;
