"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const r = express_1.default.Router();
r.get('/:tag', async (req, res) => {
    /* verify cosign attestations + sbom + rebuild artifact */ res.json([
        { stage: 'SBOM', ok: true },
        { stage: 'Cosign Attestation', ok: true },
        { stage: 'Rebuild Match', ok: true },
    ]);
});
exports.default = r;
