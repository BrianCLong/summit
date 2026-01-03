// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(name: string): any;
const fs = require('fs');
const path = require('path');

export type TaskType = 'deep-research' | 'code' | 'tool';

export interface BaseTask {
    id: string;
    type: TaskType;
    name: string;
    description: string;
}

export interface DeepResearchTask extends BaseTask {
    type: 'deep-research';
    question: string;
    requiredCitations: number;
}

export interface CodeTask extends BaseTask {
    type: 'code';
    repoPath: string;
    issue: string;
    expectedSummary: string;
    tests?: string[];
}

export interface ToolTask extends BaseTask {
    type: 'tool';
    request: string;
    toolSpec: string;
    expectedToolShape: string[];
}

export type AgenticTask = DeepResearchTask | CodeTask | ToolTask;

export function loadTasks(tasksDir: string, filterType?: TaskType): AgenticTask[] {
    const files = fs.readdirSync(tasksDir).filter((file) => file.endsWith('.jsonl'));
    const tasks: AgenticTask[] = [];
    for (const file of files) {
        const fullPath = path.join(tasksDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
            const parsed = JSON.parse(line) as AgenticTask;
            if (!filterType || parsed.type === filterType) {
                tasks.push(parsed);
            }
        }
    }
    return tasks;
}
