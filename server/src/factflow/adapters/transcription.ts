import { Transcript } from "../types.js";

export interface TranscriptionAdapter {
  transcribe(audioBuffer: Buffer): Promise<Transcript>;
}

export class MockTranscriptionAdapter implements TranscriptionAdapter {
  async transcribe(audioBuffer: Buffer): Promise<Transcript> {
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      duration: 60,
      segments: [
        {
          start: 0,
          end: 5,
          text: "The economy grew by 5% last quarter.",
          confidence: 0.95,
        },
        {
          start: 5,
          end: 10,
          text: "Inflation is down to 2%.",
          confidence: 0.92,
        },
        {
            start: 10,
            end: 15,
            text: "Unemployment is at a record low.",
            confidence: 0.88
        }
      ],
    };
  }
}
