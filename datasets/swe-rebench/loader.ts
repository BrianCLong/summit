import { SweRebenchInstance } from "./types";

export class SweRebenchLoader {
  loadDataset(path: string): Promise<SweRebenchInstance[]> {
    // Stub for loading parquet datasets
    // eslint-disable-next-line no-console
    console.log(`Loading dataset from ${path}`);
    return [];
  }
}
