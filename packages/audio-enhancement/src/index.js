"use strict";
/**
 * @intelgraph/audio-enhancement
 *
 * Audio enhancement capabilities including:
 * - Noise reduction and denoising
 * - Echo cancellation
 * - Reverberation removal
 * - Audio super-resolution
 * - Speech enhancement
 * - Dynamic range compression
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancementResultSchema = exports.NoiseReductionConfigSchema = void 0;
const zod_1 = require("zod");
exports.NoiseReductionConfigSchema = zod_1.z.object({
    algorithm: zod_1.z.enum(['spectral-subtraction', 'wiener-filter', 'rnn', 'transformer']).default('rnn'),
    strength: zod_1.z.number().min(0).max(1).default(0.5),
    noiseProfile: zod_1.z.array(zod_1.z.number()).optional(),
    adaptiveMode: zod_1.z.boolean().default(true)
});
exports.EnhancementResultSchema = zod_1.z.object({
    enhancedAudio: zod_1.z.instanceof(Buffer),
    metrics: zod_1.z.object({
        snrImprovement: zod_1.z.number().optional(),
        qualityScore: zod_1.z.number().min(0).max(1),
        processingTime: zod_1.z.number()
    })
});
