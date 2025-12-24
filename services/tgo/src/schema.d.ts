export type Task = {
    id: string;
    kind: 'build' | 'test' | 'lint' | 'fuzz' | 'policy' | 'codemod';
    files?: string[];
    estSec: number;
    needs: string[];
    caps: string[];
    env?: Record<string, string>;
    priority: 'hot' | 'normal' | 'bulk';
};
export type Worker = {
    id: string;
    caps: string[];
    maxParallel: number;
    costPerMin: number;
    region: string;
};
//# sourceMappingURL=schema.d.ts.map