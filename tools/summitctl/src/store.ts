import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { Task, TaskStore, Velocity } from './types';
import { DateTime } from 'luxon';

const getTaskFilePath = () => {
  if (fs.existsSync('.summit-tasks.yaml')) {
    return '.summit-tasks.yaml';
  }
  if (fs.existsSync('../../.summit-tasks.yaml')) {
    return '../../.summit-tasks.yaml';
  }
  return '.summit-tasks.yaml';
};

export class Store {
  private filePath: string;

  constructor() {
    this.filePath = getTaskFilePath();
  }

  load(): TaskStore {
    if (!fs.existsSync(this.filePath)) {
      return { tasks: [], velocity: {} };
    }
    const content = fs.readFileSync(this.filePath, 'utf8');
    const data = YAML.parse(content);
    return {
      tasks: data.tasks || [],
      velocity: data.velocity || {}
    };
  }

  save(data: TaskStore) {
    const content = YAML.stringify(data);
    fs.writeFileSync(this.filePath, content, 'utf8');
  }

  addTask(title: string): Task {
    const data = this.load();
    const id = `task-${Date.now()}`;
    const task: Task = {
      id,
      title,
      status: 'active',
      created_at: DateTime.utc().toISO() as string,
      updated_at: DateTime.utc().toISO() as string
    };
    data.tasks.push(task);
    this.save(data);
    return task;
  }

  getTask(id: string): Task | undefined {
    const data = this.load();
    return data.tasks.find(t => t.id === id);
  }

  listTasks(status?: Task['status']): Task[] {
    const data = this.load();
    if (status) {
      return data.tasks.filter(t => t.status === status);
    }
    return data.tasks.filter(t => t.status !== 'archived');
  }

  updateTaskStatus(id: string, status: Task['status']): Task | undefined {
    const data = this.load();
    const task = data.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      task.updated_at = DateTime.utc().toISO() as string;

      if (status === 'archived') {
        const today = DateTime.utc().toISODate() as string;
        data.velocity[today] = (data.velocity[today] || 0) + 1;
      }

      this.save(data);
    }
    return task;
  }

  getVelocity(): Velocity {
      return this.load().velocity;
  }
}
