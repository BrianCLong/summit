export type AgentTask = {
    kind: 'plan' | 'scaffold' | 'implement' | 'test' | 'review' | 'docs';
    repo: string;
    pr?: number;
    issue: string;
    budgetUSD: number;
    context: Record<string, any>;
    parentTaskId?: string;
    dependencies?: string[];
    metadata: {
        actor: string;
        timestamp: string;
        sprint_version: string;
    };
};

export type TaskResult = {
    success: boolean;
    output?: any;
    cost: number;
    duration: number;
    errors?: string[];
    artifacts?: string[];
    nextTasks?: Omit<AgentTask, 'budgetUSD'>[];
};
