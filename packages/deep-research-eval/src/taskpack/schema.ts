export interface TaskPersona {
  tenant: string;
  industry: string;
  riskProfile: string;
  complianceRegimes: string[];
  missionContext?: string;
}

export interface TaskPolicy {
  tenantId: string;
  allowSources?: string[];
  denySources?: string[];
  jurisdictions?: string[];
  rateLimit?: {
    requestsPerMinute: number;
  };
  dataAccessTags?: string[];
}

export interface TaskDefinition {
  id: string;
  topic: string;
  language: string;
  prompt: string;
  persona?: TaskPersona;
  policy?: TaskPolicy;
  objectives?: string[];
  requiredSources?: string[];
}

export interface TaskPack {
  version: string;
  tasks: TaskDefinition[];
}

export interface TaskPackParseResult {
  taskPack: TaskPack;
  warnings: string[];
}

const requiredFields = ['id', 'topic', 'language', 'prompt'] as const;

export const parseTaskPack = (payload: unknown): TaskPackParseResult => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Task pack payload must be a JSON object.');
  }

  const taskPack = payload as Partial<TaskPack>;
  if (!Array.isArray(taskPack.tasks)) {
    throw new Error('Task pack must include a tasks array.');
  }

  const warnings: string[] = [];
  const normalizedTasks: TaskDefinition[] = taskPack.tasks.map((task, index) => {
    const record = task as Partial<TaskDefinition>;
    requiredFields.forEach((field) => {
      if (!record[field]) {
        throw new Error(`Task at index ${index} missing required field: ${field}`);
      }
    });

    if (!record.id || !record.topic || !record.language || !record.prompt) {
      throw new Error(`Task at index ${index} is missing required data.`);
    }

    if (!record.objectives || record.objectives.length === 0) {
      warnings.push(`Task ${record.id} has no objectives defined.`);
    }

    return {
      id: record.id,
      topic: record.topic,
      language: record.language,
      prompt: record.prompt,
      persona: record.persona,
      policy: record.policy,
      objectives: record.objectives,
      requiredSources: record.requiredSources,
    };
  });

  return {
    taskPack: {
      version: taskPack.version ?? 'v1',
      tasks: normalizedTasks,
    },
    warnings,
  };
};
