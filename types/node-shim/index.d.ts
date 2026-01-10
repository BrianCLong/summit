// Intentionally constrained Node built-in shims for test-time type resolution.
// Use full @types/node in production toolchains; these shims keep local tests green.
declare module 'fs';
declare module 'path';
declare module 'process';
declare module 'child_process';
declare module 'url';
