"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
const b = fs_1.default.readFileSync('bundle.tar.gz');
const sig = crypto_1.default.createHash('sha256').update(b).digest('hex');
app.get('/bundle', (_, _res, next) => next());
app.get('/bundle.sha256', (_, res) => res.type('text/plain').send(sig));
app.use('/bundle', (req, res) => {
    res.type('application/gzip').send(b);
});
app.listen(process.env.PORT || 4090);
