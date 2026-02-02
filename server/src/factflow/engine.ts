import { TranscriptionAdapter } from "./adapters/transcription.js";
import { DiarizationAdapter } from "./adapters/diarization.js";
import { VerificationEngine } from "./verification.js";
import { FactFlowReport, FactFlowMetrics, Claim, Transcript } from "./types.js";
import { generateEvidenceId } from "./lib/evidence_id.js";
import { FactFlowReportSchema } from "./validation.js";

export class FactFlowEngine {
  constructor(
    private transcription: TranscriptionAdapter,
    private diarization: DiarizationAdapter,
    private verification: VerificationEngine
  ) {}

  async process(jobId: string, audioBuffer: Buffer): Promise<{ report: FactFlowReport; metrics: FactFlowMetrics }> {
    const startTime = Date.now();

    // 1. Transcribe
    const transcript = await this.transcription.transcribe(audioBuffer);

    // 2. Diarize
    const speakers = await this.diarization.diarize(audioBuffer);
    const attributedTranscript = this.diarization.assignSpeakers(transcript, speakers);

    // 3. Extract Claims (Mock)
    const claims = await this.extractClaims(attributedTranscript);

    // 4. Verify Claims
    const verifiedClaims = await Promise.all(
      claims.map(async (claim) => {
        const result = await this.verification.verify(claim.text);
        return {
          ...claim,
          ...result,
        };
      })
    );

    // 5. Construct Report
    const report: FactFlowReport = {
      job_id: jobId,
      timestamp: new Date().toISOString(),
      claims: verifiedClaims,
    };

    // 6. Validate Report
    FactFlowReportSchema.parse(report);

    // 7. Metrics
    const metrics: FactFlowMetrics = {
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

  private async extractClaims(transcript: Transcript): Promise<Claim[]> {
    // Mock extraction logic: Treat every segment as a potential claim
    // In a real system, this would use an LLM or NLP model
    return transcript.segments.map((seg, index) => ({
      id: generateEvidenceId(seg.text + index), // Deterministic ID
      text: seg.text,
      speaker: seg.speaker,
      time_range: { start: seg.start, end: seg.end },
      verdict: "unverified", // Default before verification
    }));
  }
}
