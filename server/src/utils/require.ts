
import { createRequire } from 'module';

const esmRequire = createRequire(import.meta.url);

export const requireFunc = (path: string) => {
    return esmRequire(path);
};
