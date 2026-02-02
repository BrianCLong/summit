import { SpeakerTurn, Transcript } from "../types.js";

export interface DiarizationAdapter {
  diarize(audioBuffer: Buffer): Promise<SpeakerTurn[]>;
  assignSpeakers(transcript: Transcript, turns: SpeakerTurn[]): Transcript;
}

export class MockDiarizationAdapter implements DiarizationAdapter {
  async diarize(audioBuffer: Buffer): Promise<SpeakerTurn[]> {
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return [
      { start: 0, end: 5, speaker: "Speaker A" },
      { start: 5, end: 10, speaker: "Speaker B" },
      { start: 10, end: 15, speaker: "Speaker A" },
    ];
  }

  assignSpeakers(transcript: Transcript, turns: SpeakerTurn[]): Transcript {
    // Simple overlap-based assignment
    const newSegments = transcript.segments.map((seg) => {
      const mid = (seg.start + seg.end) / 2;
      const turn = turns.find((t) => mid >= t.start && mid <= t.end);
      return {
        ...seg,
        speaker: turn ? turn.speaker : "Unknown",
      };
    });

    return {
      ...transcript,
      segments: newSegments,
    };
  }
}
