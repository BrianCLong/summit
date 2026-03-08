"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dpGate_js_1 = require("../middleware/dpGate.js");
const router = express_1.default.Router();
// Example aggregate endpoint protected by DP
router.get('/stats', (0, dpGate_js_1.dpGate)({ epsilon: 0.5, sensitivity: 1 }), (req, res) => {
    // In a real app, this would fetch from DB
    const stats = {
        count: 150, // This will be noisy
        avg: 45.2 // This requires more complex handling, but for now we noisy-fy 'count'
    };
    res.json(stats);
});
router.get('/sensitive-count', (0, dpGate_js_1.dpGate)({ epsilon: 1.0, sensitivity: 1, minK: 5 }), (req, res) => {
    const count = 3; // Small N
    res.json({ count });
});
exports.default = router;
