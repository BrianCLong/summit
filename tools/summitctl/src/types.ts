export interface Task {
  id: string;
  title: string;
  status: 'active' | 'ready-for-pr' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Velocity {
  [date: string]: number;
}

export interface TaskStore {
  tasks: Task[];
  velocity: Velocity;
}
