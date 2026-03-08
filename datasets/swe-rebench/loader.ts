import { SweRebenchInstance } from './types';

export class SweRebenchLoader {
  async loadDataset(path: string): Promise<SweRebenchInstance[]> {
    // Stub for loading parquet datasets
    console.log(`Loading dataset from ${path}`);
    return [];
  }
}
