"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const r = express_1.default.Router();
r.post('/webauthn/challenge', (_req, res) => {
    /* return challenge */ res.json({ challenge: '...' });
});
r.post('/webauthn/verify', (_req, res) => {
    /* verify */ res.json({ ok: true, level: 2 });
});
exports.default = r;
