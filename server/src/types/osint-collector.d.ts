declare module '@intelgraph/osint-collector' {
  export type CollectionType = 'rss' | 'social' | 'web' | 'custom';

  export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

  export class SimpleFeedCollector {
    constructor(config?: Record<string, unknown>);
    collect(feedUrl: string): Promise<Record<string, unknown>>;
  }
}
