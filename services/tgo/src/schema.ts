export type Task = {
  id: string;
  kind: 'build' | 'test' | 'lint' | 'fuzz' | 'policy' | 'codemod';
  files?: string[];
  estSec: number;
  needs: string[];
  caps: string[]; // e.g., ["cpu","linux"]
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
