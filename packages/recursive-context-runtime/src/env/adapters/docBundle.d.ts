import { InspectEnv, SpanRef } from '../../api';
export declare class DocBundleAdapter implements InspectEnv {
    listFiles(prefix?: string): Promise<string[]>;
    readFile(path: string, start?: number, end?: number): Promise<{
        text: string;
        span: SpanRef;
    }>;
    searchText(pattern: string, opts?: {
        paths?: string[];
        maxHits?: number;
    }): Promise<Array<{
        hit: string;
        span: SpanRef;
    }>>;
    peek(start: number, len: number): Promise<{
        text: string;
        span: SpanRef;
    }>;
    chunk(strategy: "byTokens" | "byHeadings" | "byAST" | "bySessions", opts?: any): Promise<Array<{
        span: SpanRef;
    }>>;
}
