import React, { useState } from 'react';

export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Audit frontend components', status: 'Todo' },
  { id: 't2', title: 'Build Dashboard', status: 'In Progress' },
  { id: 't3', title: 'A11Y compliance', status: 'Todo' },
];

export function TaskBacklog() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
  };

  const renderColumn = (status: TaskStatus) => {
    const columnTasks = tasks.filter((t) => t.status === status);
    return (
      <div
        style={{
          flex: 1,
          minHeight: 300,
          background: 'var(--surface-2, #f5f5f5)',
          borderRadius: 8,
          padding: 16,
          margin: 8,
          border: '1px solid var(--border)',
        }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
          {status} ({columnTasks.length})
        </h3>
        {columnTasks.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => handleDragStart(e, t.id)}
            style={{
              background: 'var(--surface, #fff)',
              padding: 12,
              borderRadius: 6,
              marginBottom: 8,
              border: '1px solid var(--border)',
              cursor: 'grab',
              fontSize: 13,
              color: 'var(--text)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {t.title}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
        Task Backlog
      </h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Drag and drop tasks to prioritize.
      </p>
      <div style={{ display: 'flex', gap: 16 }}>
        {renderColumn('Todo')}
        {renderColumn('In Progress')}
        {renderColumn('Done')}
      </div>
    </div>
  );
}
