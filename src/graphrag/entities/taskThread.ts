export interface ThreadMessage {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface TaskThread {
  id: string;
  taskId: string;
  messages: ThreadMessage[];
}
