"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.costCents = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.costCents = new prom_client_1.default.Counter({
    name: 'cost_cents_total',
    help: 'Accumulated cost in cents',
    labelNames: ['tenant', 'expert', 'component'],
});
