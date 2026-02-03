import { InspectEnv, SpanRef } from '../../api';
export declare class FSRepoAdapter implements InspectEnv {
    private rootPath;
    private handleId;
    constructor(rootPath: string, handleId: string);
    listFiles(prefix?: string): Promise<string[]>;
    readFile(filePath: string, start?: number, end?: number): Promise<{
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
