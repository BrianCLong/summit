// Ensure this file uses proper path to import, and that we mock it correctly.
// The error says "Module ... has no exported member ensureAuthenticated".
// This is weird because I just read the file and it DOES export it.
// Issue might be related to imports ending in .js in TS files or how jest mocks interaction with ts-jest.
// Or relative paths. `../middleware/auth.js` relative to `server/tests/authz/test-app.ts`
// is `server/tests/middleware/auth.js` which is WRONG.
// It should be `../../src/middleware/auth.js`.

import express from 'express';
// Correct path: from `server/tests/authz` to `server/src/middleware/auth.js`
import { ensureAuthenticated } from '../../src/middleware/auth.js';
import adminRouter from '../../src/routes/admin.js';

const app = express();
app.use(express.json());

const ensureRole = (role: string) => (req: any, res: any, next: any) => {
    if (req.user?.role !== role) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

app.use('/', ensureAuthenticated, ensureRole('admin'), adminRouter);

export { app };
