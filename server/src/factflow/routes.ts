import { Router } from "express";
import { FactFlowEngine } from "./engine.js";
import { MockTranscriptionAdapter } from "./adapters/transcription.js";
import { MockDiarizationAdapter } from "./adapters/diarization.js";
import { MockVerificationEngine } from "./verification.js";
import { PublishGate } from "./gate.js";
import { User } from "../lib/auth.js";
import { randomUUID } from "node:crypto";

const router = Router();

// Instantiate components (Singleton-ish for this router)
const transcription = new MockTranscriptionAdapter();
const diarization = new MockDiarizationAdapter();
const verification = new MockVerificationEngine();
const engine = new FactFlowEngine(transcription, diarization, verification);
const gate = new PublishGate();

// In-memory job store for demo purposes
const jobStore = new Map<string, any>();

// POST /jobs - Start a new job
router.post("/jobs", async (req, res) => {
  try {
    const { audioBase64 } = req.body;

    // In a real implementation, we'd process async queue.
    // For MWS, we might run it inline or minimal async.
    const jobId = randomUUID();
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
  } catch (error: any) {
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
  const user = (req as any).user as User;

  if (!user) {
      return res.status(401).json({ error: "Authentication required" });
  }

  const allowed = gate.checkPublishPermission(user, job.result.report);

  if (allowed) {
      // Logic to actually "publish" (e.g. push to CMS) would go here
      return res.json({ status: "published", published_at: new Date().toISOString() });
  } else {
      return res.status(403).json({ error: "Publish denied by policy" });
  }
});

export default router;
