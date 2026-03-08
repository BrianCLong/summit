"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const r = express_1.default.Router();
const current = 1;
r.get('/schema/version', (_req, res) => res.json({ version: current }));
exports.default = r;
