import DataLoader from 'dataloader';

export interface LoaderOptions<K, V> {
  cache?: boolean;
  maxBatchSize?: number;
  batchScheduleFn?: (callback: () => void) => void;
  cacheKeyFn?: (key: K) => any;
  cacheMap?: Map<any, Promise<V>>;
}

export interface BatchLoadFn<K, V> {
  (keys: readonly K[]): Promise<(V | Error)[]>;
}

export interface DataLoaderContext {
  loaders: Map<string, DataLoader<any, any>>;
}

export interface EntityLoaderConfig<K, V> {
  name: string;
  batchFn: BatchLoadFn<K, V>;
  options?: LoaderOptions<K, V>;
}
