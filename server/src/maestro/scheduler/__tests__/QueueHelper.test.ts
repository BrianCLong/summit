import { describe, it, expect, beforeEach } from '@jest/globals';
import { QueueHelper, PrioritizedItem } from '../QueueHelper.js';

interface TestItem extends PrioritizedItem {
  id: string;
}

describe('QueueHelper', () => {
  let queue: QueueHelper<TestItem>;

  beforeEach(() => {
    queue = new QueueHelper<TestItem>();
  });

  it('should enqueue items and sort by priority', () => {
    queue.enqueue({ id: 'low', priority: 1 });
    queue.enqueue({ id: 'high', priority: 10 });
    queue.enqueue({ id: 'medium', priority: 5 });

    expect(queue.size).toBe(3);
    expect(queue.peek()?.id).toBe('high');

    expect(queue.dequeue()?.id).toBe('high');
    expect(queue.dequeue()?.id).toBe('medium');
    expect(queue.dequeue()?.id).toBe('low');
  });

  it('should handle empty queue', () => {
    expect(queue.isEmpty()).toBe(true);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();
  });

  it('should remove items based on predicate', () => {
    queue.enqueue({ id: '1', priority: 1 });
    queue.enqueue({ id: '2', priority: 1 });
    queue.enqueue({ id: '3', priority: 1 });

    queue.remove(item => item.id === '2');

    expect(queue.size).toBe(2);
    expect(queue.getAll().find(i => i.id === '2')).toBeUndefined();
  });
});
