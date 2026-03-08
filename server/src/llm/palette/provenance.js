"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaletteProvenanceRecorder = void 0;
exports.buildCandidateEvidence = buildCandidateEvidence;
exports.capturePalettePrompt = capturePalettePrompt;
const injection_js_1 = require("./injection.js");
class PaletteProvenanceRecorder {
    events = [];
    ledger = null;
    async record(event) {
        this.events.push(event);
        try {
            if (!this.ledger) {
                const module = await Promise.resolve().then(() => __importStar(require('../../provenance/ledger.js')));
                this.ledger = module.ProvenanceLedgerV2.getInstance();
            }
            await this.ledger.appendEntry({
                tenantId: event.tenantId || 'system',
                actionType: 'LLM_PALETTE_APPLIED',
                resourceType: 'ReasoningPalette',
                resourceId: event.paletteId,
                actorId: 'llm-router',
                actorType: 'system',
                timestamp: new Date(),
                payload: {
                    mutationType: 'CREATE',
                    entityId: event.paletteId,
                    entityType: 'ReasoningPalette',
                    diff: [],
                    reason: 'llm_run',
                    candidates: event.candidates,
                    selectedIndex: event.selectedIndex,
                },
                metadata: {
                    requestId: event.requestId,
                    strategy: event.strategy,
                    injectionKind: event.injectionKind,
                    decoding: event.decoding,
                    paletteId: event.paletteId,
                },
            });
        }
        catch (err) {
            // Fall back to console to avoid breaking runtime when ledger is unavailable
            console.warn('Failed to append palette provenance entry', err);
        }
    }
}
exports.PaletteProvenanceRecorder = PaletteProvenanceRecorder;
function buildCandidateEvidence(candidates) {
    return candidates.map((c) => ({
        paletteId: c.palette.id,
        responseId: c.response?.id,
        error: c.error?.message,
    }));
}
function capturePalettePrompt(palette) {
    return (0, injection_js_1.paletteAsPromptContent)(palette.injection);
}
