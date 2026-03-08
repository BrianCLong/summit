"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const engine_js_1 = require("./engine.js");
const transcription_js_1 = require("./adapters/transcription.js");
const diarization_js_1 = require("./adapters/diarization.js");
const verification_js_1 = require("./verification.js");
const gate_js_1 = require("./gate.js");
const node_crypto_1 = require("node:crypto");
const router = (0, express_1.Router)();
// Instantiate components (Singleton-ish for this router)
const transcription = new transcription_js_1.MockTranscriptionAdapter();
const diarization = new diarization_js_1.MockDiarizationAdapter();
const verification = new verification_js_1.MockVerificationEngine();
const engine = new engine_js_1.FactFlowEngine(transcription, diarization, verification);
const gate = new gate_js_1.PublishGate();
// In-memory job store for demo purposes
const jobStore = new Map();
// POST /jobs - Start a new job
router.post("/jobs", async (req, res) => {
    try {
        const { audioBase64 } = req.body;
        // In a real implementation, we'd process async queue.
        // For MWS, we might run it inline or minimal async.
        const jobId = (0, node_crypto_1.randomUUID)();
        jobStore.set(jobId, { status: "processing" });
        // Simulate async processing (or run inline if fast enough)
        const audioBuffer = Buffer.from(audioBase64 || "", "base64"); // Handle empty for mock
        // Fire and forget (or await if we want immediate response)
        engine.process(jobId, audioBuffer).then((result) => {
            jobStore.set(jobId, { status: "completed", result });
        }).catch((err) => {
            jobStore.set(jobId, { status: "failed", error: err.message });
        });
        res.json({ job_id: jobId, status: "processing" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /jobs/:id - Get job status
router.get("/jobs/:id", (req, res) => {
    const jobId = req.params.id;
    const job = jobStore.get(jobId);
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
});
// POST /jobs/:id/publish - Publish Gate
router.post("/jobs/:id/publish", (req, res) => {
    const jobId = req.params.id;
    const job = jobStore.get(jobId);
    if (!job || job.status !== "completed") {
        return res.status(400).json({ error: "Job not ready or not found" });
    }
    // Get user from request (attached by auth middleware)
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    const allowed = gate.checkPublishPermission(user, job.result.report);
    if (allowed) {
        // Logic to actually "publish" (e.g. push to CMS) would go here
        return res.json({ status: "published", published_at: new Date().toISOString() });
    }
    else {
        return res.status(403).json({ error: "Publish denied by policy" });
    }
});
exports.default = router;
