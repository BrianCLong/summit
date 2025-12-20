export interface PrioritizedItem {
  priority: number;
  // Allows for additional properties
  [key: string]: any;
}

export class QueueHelper<T extends PrioritizedItem> {
  private queue: T[] = [];

  constructor(initialItems: T[] = []) {
    this.queue = [...initialItems];
    this.sort();
  }

  public enqueue(item: T): void {
    this.queue.push(item);
    this.sort();
  }

  public dequeue(): T | undefined {
    return this.queue.shift();
  }

  public peek(): T | undefined {
    return this.queue[0];
  }

  public get size(): number {
    return this.queue.length;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public clear(): void {
    this.queue = [];
  }

  public getAll(): T[] {
    return [...this.queue];
  }

  public remove(predicate: (item: T) => boolean): void {
    this.queue = this.queue.filter(item => !predicate(item));
  }

  private sort(): void {
    // Higher priority first
    this.queue.sort((a, b) => b.priority - a.priority);
  }
}
