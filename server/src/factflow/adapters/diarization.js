"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDiarizationAdapter = void 0;
class MockDiarizationAdapter {
    async diarize(audioBuffer) {
        // Mock delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [
            { start: 0, end: 5, speaker: "Speaker A" },
            { start: 5, end: 10, speaker: "Speaker B" },
            { start: 10, end: 15, speaker: "Speaker A" },
        ];
    }
    assignSpeakers(transcript, turns) {
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
exports.MockDiarizationAdapter = MockDiarizationAdapter;
