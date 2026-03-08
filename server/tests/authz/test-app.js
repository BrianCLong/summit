"use strict";
// Ensure this file uses proper path to import, and that we mock it correctly.
// The error says "Module ... has no exported member ensureAuthenticated".
// This is weird because I just read the file and it DOES export it.
// Issue might be related to imports ending in .js in TS files or how jest mocks interaction with ts-jest.
// Or relative paths. `../middleware/auth.js` relative to `server/tests/authz/test-app.ts`
// is `server/tests/middleware/auth.js` which is WRONG.
// It should be `../../src/middleware/auth.js`.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
// Correct path: from `server/tests/authz` to `server/src/middleware/auth.js`
const auth_js_1 = require("../../src/middleware/auth.js");
const admin_js_1 = __importDefault(require("../../src/routes/admin.js"));
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
const ensureRole = (role) => (req, res, next) => {
    if (req.user?.role !== role) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};
app.use('/', auth_js_1.ensureAuthenticated, ensureRole('admin'), admin_js_1.default);
