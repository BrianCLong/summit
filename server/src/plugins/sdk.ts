export type PluginContext = {
  vault: { read: (path: string) => Promise<any> };
  cache: {
    get: (key: string) => Promise<any | null>;
    set: (key: string, val: any, ttlSec?: number) => Promise<void>;
  };
  logger: {
    info: (...a: any[]) => void;
    warn: (...a: any[]) => void;
    error: (...a: any[]) => void;
  };
};

export interface Plugin<TInputs = any, TOutput = any> {
  name: string;
  run: (inputs: TInputs, ctx: PluginContext) => Promise<TOutput>;
}

export function createPlugin<TI, TO>(
  name: string,
  run: Plugin<TI, TO>['run'],
): Plugin<TI, TO> {
  return { name, run };
}
