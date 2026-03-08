"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admissionDecision = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.admissionDecision = new prom_client_1.default.Counter({
    name: 'admission_decision_total',
    help: 'Count of admission decisions',
    labelNames: ['decision', 'tier', 'expert', 'reason'],
});
