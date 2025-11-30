/**
 * Time Index - Interval Tree Implementation
 *
 * Provides efficient temporal range queries using an augmented BST (interval tree).
 * Supports:
 * - Range scans: Find all intervals overlapping a time window
 * - Point queries: Find all intervals containing a timestamp
 * - Interval insertion/deletion
 */

import type { TimeWindow } from '../types/index.js';
import { intervalsOverlap } from '../utils/time.js';

/**
 * Entry stored in the time index
 */
export interface TimeIndexEntry<T = unknown> {
  id: string;
  entityId: string;
  start: number; // UTC ms
  end: number; // UTC ms
  data: T;
}

/**
 * Internal node in the interval tree
 */
interface IntervalNode<T> {
  entry: TimeIndexEntry<T>;
  maxEnd: number; // Maximum end time in this subtree
  left: IntervalNode<T> | null;
  right: IntervalNode<T> | null;
  height: number;
}

/**
 * Time Index using AVL Interval Tree
 */
export class TimeIndex<T = unknown> {
  private root: IntervalNode<T> | null = null;
  private size: number = 0;
  private readonly entriesById: Map<string, TimeIndexEntry<T>> = new Map();
  private readonly entriesByEntity: Map<string, Set<string>> = new Map();

  /**
   * Get the number of entries in the index
   */
  get count(): number {
    return this.size;
  }

  /**
   * Insert an entry into the index
   */
  insert(entry: TimeIndexEntry<T>): void {
    if (this.entriesById.has(entry.id)) {
      // Update existing entry
      this.delete(entry.id);
    }

    this.root = this.insertNode(this.root, entry);
    this.size++;

    this.entriesById.set(entry.id, entry);

    if (!this.entriesByEntity.has(entry.entityId)) {
      this.entriesByEntity.set(entry.entityId, new Set());
    }
    this.entriesByEntity.get(entry.entityId)!.add(entry.id);
  }

  /**
   * Delete an entry by ID
   */
  delete(id: string): boolean {
    const entry = this.entriesById.get(id);
    if (!entry) {
      return false;
    }

    this.root = this.deleteNode(this.root, entry);
    this.size--;

    this.entriesById.delete(id);
    this.entriesByEntity.get(entry.entityId)?.delete(id);

    return true;
  }

  /**
   * Find all entries overlapping a time window
   */
  findOverlapping(window: TimeWindow): TimeIndexEntry<T>[] {
    const results: TimeIndexEntry<T>[] = [];
    this.searchOverlapping(this.root, window, results);
    return results;
  }

  /**
   * Find all entries containing a specific timestamp
   */
  findAtTime(timestamp: number): TimeIndexEntry<T>[] {
    return this.findOverlapping({ start: timestamp, end: timestamp });
  }

  /**
   * Find all entries for a specific entity
   */
  findByEntity(entityId: string): TimeIndexEntry<T>[] {
    const entryIds = this.entriesByEntity.get(entityId);
    if (!entryIds) {
      return [];
    }

    return Array.from(entryIds)
      .map((id) => this.entriesById.get(id))
      .filter((entry): entry is TimeIndexEntry<T> => entry !== undefined);
  }

  /**
   * Find all entries for a specific entity within a time window
   */
  findByEntityInWindow(
    entityId: string,
    window: TimeWindow,
  ): TimeIndexEntry<T>[] {
    const entityEntries = this.findByEntity(entityId);
    return entityEntries.filter((entry) =>
      intervalsOverlap({ start: entry.start, end: entry.end }, window),
    );
  }

  /**
   * Find entries for multiple entities that overlap in time
   */
  findCoTemporalEntries(
    entityIds: string[],
    window: TimeWindow,
  ): Map<string, TimeIndexEntry<T>[]> {
    const result = new Map<string, TimeIndexEntry<T>[]>();

    for (const entityId of entityIds) {
      result.set(entityId, this.findByEntityInWindow(entityId, window));
    }

    return result;
  }

  /**
   * Get entry by ID
   */
  get(id: string): TimeIndexEntry<T> | undefined {
    return this.entriesById.get(id);
  }

  /**
   * Check if entry exists
   */
  has(id: string): boolean {
    return this.entriesById.has(id);
  }

  /**
   * Get all entity IDs in the index
   */
  getEntityIds(): string[] {
    return Array.from(this.entriesByEntity.keys());
  }

  /**
   * Get time bounds of all entries
   */
  getTimeBounds(): TimeWindow | null {
    if (this.size === 0) {
      return null;
    }

    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const entry of this.entriesById.values()) {
      minStart = Math.min(minStart, entry.start);
      maxEnd = Math.max(maxEnd, entry.end);
    }

    return { start: minStart, end: maxEnd };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.root = null;
    this.size = 0;
    this.entriesById.clear();
    this.entriesByEntity.clear();
  }

  /**
   * Iterate over all entries
   */
  *entries(): IterableIterator<TimeIndexEntry<T>> {
    yield* this.entriesById.values();
  }

  // =========================================================================
  // Private AVL Tree Operations
  // =========================================================================

  private insertNode(
    node: IntervalNode<T> | null,
    entry: TimeIndexEntry<T>,
  ): IntervalNode<T> {
    if (!node) {
      return {
        entry,
        maxEnd: entry.end,
        left: null,
        right: null,
        height: 1,
      };
    }

    // Insert based on start time (use id as tiebreaker for stability)
    if (
      entry.start < node.entry.start ||
      (entry.start === node.entry.start && entry.id < node.entry.id)
    ) {
      node.left = this.insertNode(node.left, entry);
    } else {
      node.right = this.insertNode(node.right, entry);
    }

    // Update maxEnd
    node.maxEnd = Math.max(
      node.entry.end,
      this.getMaxEnd(node.left),
      this.getMaxEnd(node.right),
    );

    // Update height and balance
    return this.balance(node);
  }

  private deleteNode(
    node: IntervalNode<T> | null,
    entry: TimeIndexEntry<T>,
  ): IntervalNode<T> | null {
    if (!node) {
      return null;
    }

    if (entry.id === node.entry.id) {
      // Found the node to delete
      if (!node.left && !node.right) {
        return null;
      }
      if (!node.left) {
        return node.right;
      }
      if (!node.right) {
        return node.left;
      }

      // Node has two children - find successor
      const successor = this.findMin(node.right);
      node.entry = successor.entry;
      node.right = this.deleteNode(node.right, successor.entry);
    } else if (
      entry.start < node.entry.start ||
      (entry.start === node.entry.start && entry.id < node.entry.id)
    ) {
      node.left = this.deleteNode(node.left, entry);
    } else {
      node.right = this.deleteNode(node.right, entry);
    }

    // Update maxEnd
    node.maxEnd = Math.max(
      node.entry.end,
      this.getMaxEnd(node.left),
      this.getMaxEnd(node.right),
    );

    return this.balance(node);
  }

  private searchOverlapping(
    node: IntervalNode<T> | null,
    window: TimeWindow,
    results: TimeIndexEntry<T>[],
  ): void {
    if (!node) {
      return;
    }

    // Prune: if maxEnd in this subtree is before window start, skip
    if (node.maxEnd < window.start) {
      return;
    }

    // Search left subtree
    this.searchOverlapping(node.left, window, results);

    // Check current node
    if (intervalsOverlap({ start: node.entry.start, end: node.entry.end }, window)) {
      results.push(node.entry);
    }

    // Prune right: if node's start is after window end, skip right
    if (node.entry.start > window.end) {
      return;
    }

    // Search right subtree
    this.searchOverlapping(node.right, window, results);
  }

  private findMin(node: IntervalNode<T>): IntervalNode<T> {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  private getMaxEnd(node: IntervalNode<T> | null): number {
    return node ? node.maxEnd : -Infinity;
  }

  private getHeight(node: IntervalNode<T> | null): number {
    return node ? node.height : 0;
  }

  private getBalance(node: IntervalNode<T> | null): number {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  private updateHeight(node: IntervalNode<T>): void {
    node.height =
      1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
  }

  private rotateRight(y: IntervalNode<T>): IntervalNode<T> {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    this.updateHeight(y);
    this.updateHeight(x);

    // Update maxEnd
    y.maxEnd = Math.max(
      y.entry.end,
      this.getMaxEnd(y.left),
      this.getMaxEnd(y.right),
    );
    x.maxEnd = Math.max(
      x.entry.end,
      this.getMaxEnd(x.left),
      this.getMaxEnd(x.right),
    );

    return x;
  }

  private rotateLeft(x: IntervalNode<T>): IntervalNode<T> {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    this.updateHeight(x);
    this.updateHeight(y);

    // Update maxEnd
    x.maxEnd = Math.max(
      x.entry.end,
      this.getMaxEnd(x.left),
      this.getMaxEnd(x.right),
    );
    y.maxEnd = Math.max(
      y.entry.end,
      this.getMaxEnd(y.left),
      this.getMaxEnd(y.right),
    );

    return y;
  }

  private balance(node: IntervalNode<T>): IntervalNode<T> {
    this.updateHeight(node);

    const balance = this.getBalance(node);

    // Left heavy
    if (balance > 1) {
      if (this.getBalance(node.left) < 0) {
        node.left = this.rotateLeft(node.left!);
      }
      return this.rotateRight(node);
    }

    // Right heavy
    if (balance < -1) {
      if (this.getBalance(node.right) > 0) {
        node.right = this.rotateRight(node.right!);
      }
      return this.rotateLeft(node);
    }

    return node;
  }
}

/**
 * Factory function to create a time index
 */
export function createTimeIndex<T = unknown>(): TimeIndex<T> {
  return new TimeIndex<T>();
}
