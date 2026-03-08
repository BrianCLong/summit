"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactFlowEngine = void 0;
const evidence_id_js_1 = require("./lib/evidence_id.js");
const validation_js_1 = require("./validation.js");
class FactFlowEngine {
    transcription;
    diarization;
    verification;
    constructor(transcription, diarization, verification) {
        this.transcription = transcription;
        this.diarization = diarization;
        this.verification = verification;
    }
    async process(jobId, audioBuffer) {
        const startTime = Date.now();
        // 1. Transcribe
        const transcript = await this.transcription.transcribe(audioBuffer);
        // 2. Diarize
        const speakers = await this.diarization.diarize(audioBuffer);
        const attributedTranscript = this.diarization.assignSpeakers(transcript, speakers);
        // 3. Extract Claims (Mock)
        const claims = await this.extractClaims(attributedTranscript);
        // 4. Verify Claims
        const verifiedClaims = await Promise.all(claims.map(async (claim) => {
            const result = await this.verification.verify(claim.text);
            return {
                ...claim,
                ...result,
            };
        }));
        // 5. Construct Report
        const report = {
            job_id: jobId,
            timestamp: new Date().toISOString(),
            claims: verifiedClaims,
        };
        // 6. Validate Report
        validation_js_1.FactFlowReportSchema.parse(report);
        // 7. Metrics
        const metrics = {
            job_id: jobId,
            processing_time_ms: Date.now() - startTime,
            audio_duration_sec: transcript.duration,
            cache_hit: false, // TODO: Implement cache
            claims_count: verifiedClaims.length,
            verified_count: verifiedClaims.filter((c) => c.verdict === "verified").length,
            needs_review_count: verifiedClaims.filter((c) => c.verdict === "needs_review").length,
        };
        return { report, metrics };
    }
    async extractClaims(transcript) {
        // Mock extraction logic: Treat every segment as a potential claim
        // In a real system, this would use an LLM or NLP model
        return transcript.segments.map((seg, index) => ({
            id: (0, evidence_id_js_1.generateEvidenceId)(seg.text + index), // Deterministic ID
            text: seg.text,
            speaker: seg.speaker,
            time_range: { start: seg.start, end: seg.end },
            verdict: "unverified", // Default before verification
        }));
    }
}
exports.FactFlowEngine = FactFlowEngine;
