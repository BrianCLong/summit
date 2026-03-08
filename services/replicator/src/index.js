"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const push_1 = __importDefault(require("./push"));
const bootstrap_1 = require("./bootstrap");
const app = (0, express_1.default)();
app.use(push_1.default);
(0, bootstrap_1.startReplicator)();
app.listen(process.env.PORT || 4030);
