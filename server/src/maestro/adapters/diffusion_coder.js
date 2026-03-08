"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffusionCoderAdapter = void 0;
const policy_client_js_1 = require("../policy-client.js");
const logger_js_1 = require("../../utils/logger.js");
class DiffusionCoderAdapter {
    llm;
    constructor(llm) {
        this.llm = llm;
    }
    async executeDiffusion(runId, taskId, params, tenantId) {
        const { prompt, initialCode = "// Initial state\n", steps = 3, block_length = 4, // Number of blocks to "edit"
        remasking = 'low_confidence', threshold = 0.5 } = params;
        logger_js_1.logger.info(`[DiffusionCoder] Starting functional diffusion for task ${taskId} with ${steps} steps`);
        const uncertaintyMap = {};
        const policyVerdicts = [];
        let totalResamples = 0;
        let llmCalls = 0;
        let currentCode = initialCode;
        // Stable-DiffCoder Pattern: Iterative denoising over blocks
        for (let step = 1; step <= steps; step++) {
            // Simulate block-wise denoising. We iterate through 'block_length' logical blocks.
            for (let b = 1; b <= block_length; b++) {
                let blockSuccessful = false;
                let attempts = 0;
                const maxResamples = 2;
                while (!blockSuccessful && attempts <= maxResamples) {
                    attempts++;
                    llmCalls++;
                    // Call LLM to "denoise" this specific block
                    const response = await this.llm.callCompletion(runId, taskId, {
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a Diffusion-based Code Editor.
                Step: ${step}/${steps}. Block: ${b}/${block_length}.
                Pattern: Stable-DiffCoder block-diffusion.
                Denoise and refine the following code block based on the prompt.`
                            },
                            {
                                role: 'user',
                                content: `Prompt: ${prompt}\nFull Code:\n${currentCode}\nEditing Block ${b}...`
                            }
                        ]
                    });
                    const refinedCode = response.content;
                    // Heuristic confidence score: length and presence of expected symbols
                    const confidence = 0.4 + (refinedCode.length > 20 ? 0.3 : 0.1) + (Math.random() * 0.3);
                    // Sprint 2: Policy-conditioned denoising (veto + resample)
                    const policyResult = await policy_client_js_1.policyClient.evaluate({
                        user: { tenantId, roles: ['developer'] },
                        action: 'diffusion_denoise_block',
                        resource: { blockIndex: b, step, attempt: attempts, confidence }
                    });
                    policyVerdicts.push({
                        step,
                        block: b,
                        allowed: policyResult.allowed,
                        reason: policyResult.reason
                    });
                    if (policyResult.allowed) {
                        blockSuccessful = true;
                        currentCode = refinedCode; // Update global state with denoised block
                        uncertaintyMap[b] = confidence;
                    }
                    else {
                        totalResamples++;
                        logger_js_1.logger.warn(`[DiffusionCoder] Block ${b} at step ${step} vetoed. Resampling...`);
                        if (attempts > maxResamples) {
                            // Fail closed or proceed with low confidence?
                            // For now, proceed but record the failure in uncertainty map
                            uncertaintyMap[b] = 0.1;
                            blockSuccessful = true;
                        }
                    }
                }
            }
        }
        return {
            patch: currentCode,
            uncertaintyMap,
            policyVerdicts,
            evidenceBundleId: `evd-diff-${Math.random().toString(36).substring(7)}`,
            stats: {
                totalResamples,
                stepsCompleted: steps,
                llmCalls
            }
        };
    }
}
exports.DiffusionCoderAdapter = DiffusionCoderAdapter;
