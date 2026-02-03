import { Logger } from 'pino';

export class FactFlowService {
  constructor(private logger: Logger) {}

  async transcribe(audioUrl: string): Promise<{ text: string; confidence: number }> {
    this.logger.info({ audioUrl }, 'Simulating transcription');
    // MVP stub
    return {
      text: "This is a simulated transcription of the provided audio file.",
      confidence: 0.95
    };
  }

  async verifyClaim(claim: string): Promise<{ verdict: string; confidence: number; evidence: string[] }> {
    this.logger.info({ claim }, 'Simulating claim verification');
    // MVP stub
    return {
      verdict: "Unverified",
      confidence: 0.5,
      evidence: ["Source A", "Source B"]
    };
  }
}
