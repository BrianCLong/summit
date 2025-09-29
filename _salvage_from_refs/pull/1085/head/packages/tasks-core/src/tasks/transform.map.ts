import { defineTask } from '@summit/maestro-sdk';

type Mapper<T> = (row: any) => T;
interface In<TOut> { rows: any[]; mapper: string }

// Note: mapper is a JS function body in a sandboxed new Function (trusted catalogs only)
export default defineTask<In<any>, { rows: any[] }> ({
  async execute(_ctx, { payload }){
    const fn = new Function('row', payload.mapper) as Mapper<any>;
    const out = payload.rows.map(r => fn(r));
    return { payload: { rows: out } };
  }
});
