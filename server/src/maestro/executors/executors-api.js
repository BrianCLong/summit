"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const executors_repo_js_1 = require("./executors-repo.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated); // Ensure all routes require authentication
const ExecCreate = zod_1.z.object({
    name: zod_1.z.string().min(3).max(64),
    kind: zod_1.z.enum(['cpu', 'gpu']),
    labels: zod_1.z.array(zod_1.z.string().min(1).max(32)).default([]),
    capacity: zod_1.z.number().int().min(1).max(1024).default(1),
    status: zod_1.z.enum(['ready', 'busy', 'offline']).default('ready'),
});
router.get('/executors', (0, rbac_js_1.requirePermission)('executor:read'), async (req, res) => {
    const tenantId = req.user?.tenantId || 'default';
    const list = await executors_repo_js_1.executorsRepo.list(tenantId);
    res.json(list);
});
router.post('/executors', (0, rbac_js_1.requirePermission)('executor:update'), async (req, res) => {
    const parse = ExecCreate.safeParse(req.body || {});
    if (!parse.success)
        return res
            .status(400)
            .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = req.user?.tenantId || 'default';
    const created = await executors_repo_js_1.executorsRepo.create(parse.data, tenantId);
    res.status(201).json(created);
});
exports.default = router;
