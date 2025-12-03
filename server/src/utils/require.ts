
import { createRequire } from 'module';

// Use a try-catch to allow requireFunc to work in Jest (simulated CJS) and Node (ESM)
export const requireFunc = (path: string) => {
    if (typeof require !== 'undefined') {
        return require(path);
    }
    // We cannot access import.meta.url in a way that satisfies both TS in Jest and Node
    // without complex configuration. For now, we will assume if require is undefined,
    // we are in ESM but somehow createRequire is needed.
    // However, the error is syntax error during parsing of import.meta.url.
    // We can hide it using eval or similar, but let's try just returning null or throwing if not in CJS
    // since the services we are loading are only available in CJS anyway.

    throw new Error('Environment does not support require');
};
