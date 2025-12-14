/**
 * A generic Least Recently Used (LRU) Cache implementation.
 *
 * Stores key-value pairs up to a specified capacity. When the capacity is reached,
 * the least recently used item is evicted to make space for the new item.
 *
 * @typeParam K - The type of keys.
 * @typeParam V - The type of values.
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private capacity: number;

  /**
   * Creates an instance of LRUCache.
   *
   * @param capacity - The maximum number of items the cache can hold.
   */
  constructor(capacity: number) {
    this.cache = new Map<K, V>();
    this.capacity = capacity;
  }

  /**
   * Retrieves an item from the cache.
   *
   * Accessing an item moves it to the most recently used position.
   *
   * @param key - The key of the item to retrieve.
   * @returns The value associated with the key, or undefined if not found.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key)!;
    // Move the accessed item to the end to mark it as most recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Adds or updates an item in the cache.
   *
   * If the key already exists, its value is updated and it becomes the most recently used.
   * If the key does not exist and the cache is full, the least recently used item is evicted.
   *
   * @param key - The key of the item to add.
   * @param value - The value to associate with the key.
   */
  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove the least recently used item (first item in Map)
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }

  /**
   * Returns the current number of items in the cache.
   *
   * @returns The size of the cache.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clears all items from the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

export default LRUCache;
