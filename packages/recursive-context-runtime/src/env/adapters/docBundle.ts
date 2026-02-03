import { InspectEnv, SpanRef } from '../../api';

export class DocBundleAdapter implements InspectEnv {
  async listFiles(prefix?: string): Promise<string[]> {
      return [];
  }
  async readFile(path: string, start?: number, end?: number): Promise<{ text: string; span: SpanRef }> {
      throw new Error("Not implemented");
  }
  async searchText(pattern: string, opts?: { paths?: string[]; maxHits?: number }): Promise<Array<{ hit: string; span: SpanRef }>> {
       return [];
  }
  async peek(start: number, len: number): Promise<{ text: string; span: SpanRef }> {
      throw new Error("Not implemented");
  }
  async chunk(strategy: "byTokens" | "byHeadings" | "byAST" | "bySessions", opts?: any): Promise<Array<{ span: SpanRef }>> {
      return [];
  }
}
