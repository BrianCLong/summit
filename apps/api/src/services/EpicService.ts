import { EPIC_DEFINITIONS } from "../db/epicDefinitions.js";
import {
  EpicDefinition,
  EpicProgressSnapshot,
  EpicStatus,
  EpicTaskState,
  EpicUpdatePayload,
} from "../contracts/epics.js";

const DEFAULT_STATUS: EpicStatus = "not_started";

export class EpicService {
  private readonly definitions: EpicDefinition[];
  private readonly state = new Map<string, EpicTaskState>();
  private readonly clock: () => Date;

  constructor(
    definitions: EpicDefinition[] = EPIC_DEFINITIONS,
    clock: () => Date = () => new Date()
  ) {
    this.definitions = definitions;
    this.clock = clock;
    this.seedState();
  }

  private seedState(): void {
    const now = this.clock().toISOString();
    this.definitions.forEach((epic) => {
      epic.tasks.forEach((task) => {
        const key = this.buildKey(epic.id, task.id);
        if (!this.state.has(key)) {
          this.state.set(key, {
            id: task.id,
            description: task.description,
            status: DEFAULT_STATUS,
            updatedAt: now,
          });
        }
      });
    });
  }

  private buildKey(epicId: string, taskId: string): string {
    return `${epicId}:${taskId}`;
  }

  list(): EpicProgressSnapshot[] {
    return this.definitions.map((epic) => this.buildSnapshot(epic));
  }

  get(epicId: string): EpicProgressSnapshot | null {
    const definition = this.definitions.find((item) => item.id === epicId);
    if (!definition) return null;
    return this.buildSnapshot(definition);
  }

  updateTask(epicId: string, taskId: string, payload: EpicUpdatePayload): EpicProgressSnapshot {
    const definition = this.definitions.find((item) => item.id === epicId);
    if (!definition) {
      throw new Error(`Epic ${epicId} not found`);
    }

    const taskDefinition = definition.tasks.find((task) => task.id === taskId);
    if (!taskDefinition) {
      throw new Error(`Task ${taskId} not found for epic ${epicId}`);
    }

    const key = this.buildKey(epicId, taskId);
    const now = this.clock().toISOString();
    this.state.set(key, {
      id: taskId,
      description: taskDefinition.description,
      status: payload.status,
      note: payload.note,
      owner: payload.owner,
      updatedAt: now,
    });

    return this.buildSnapshot(definition);
  }

  private buildSnapshot(definition: EpicDefinition): EpicProgressSnapshot {
    const tasks: EpicTaskState[] = definition.tasks.map((task) => {
      const key = this.buildKey(definition.id, task.id);
      const existing = this.state.get(key);
      return (
        existing ?? {
          id: task.id,
          description: task.description,
          status: DEFAULT_STATUS,
          updatedAt: this.clock().toISOString(),
        }
      );
    });

    const completedCount = tasks.filter((task) => task.status === "completed").length;
    const blockedCount = tasks.filter((task) => task.status === "blocked").length;
    const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

    return {
      ...definition,
      tasks,
      completedCount,
      blockedCount,
      progress,
    };
  }
}
