"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const pino_1 = __importDefault(require("pino"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || 'info' });
const app = (0, express_1.default)();
app.use(express_1.default.json());
const Schema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
});
app.post('/submit', (req, res) => {
    const result = Schema.safeParse(req.body);
    if (!result.success) {
        logger.warn({ errors: result.error.errors });
        return res.status(400).json({ error: 'Invalid input' });
    }
    logger.info({ user: result.data });
    res.json({ status: 'ok' });
});
const openapi = {
    openapi: '3.0.0',
    info: { title: 'Secure Service API', version: '1.0.0' },
    paths: { '/submit': { post: { summary: 'Submit user data' } } },
};
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi));
app.listen(8080, () => logger.info('Listening on :8080'));
