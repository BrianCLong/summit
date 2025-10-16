#!/usr/bin/env python3
"""
Whisper Speech-to-Text Transcription Script
Handles audio transcription using OpenAI Whisper models
"""

import argparse
import json
import os
import sys
import warnings
from typing import Any

import librosa
import torch
import whisper

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)


class WhisperTranscription:
    def __init__(self, model_name: str = "base", device: str = "auto"):
        """Initialize Whisper transcription engine"""
        self.device = self._get_device(device)
        self.model = self._load_model(model_name)

    def _get_device(self, device: str) -> str:
        """Determine the best device to use"""
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device

    def _load_model(self, model_name: str):
        """Load Whisper model"""
        try:
            return whisper.load_model(model_name, device=self.device)
        except Exception as e:
            print(f"Error loading model {model_name}: {e}", file=sys.stderr)
            # Fallback to smallest model
            return whisper.load_model("tiny", device=self.device)

    def transcribe_audio(
        self,
        audio_path: str,
        language: str | None = None,
        enable_word_timestamps: bool = True,
        enable_punctuation: bool = True,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """Transcribe audio file using Whisper"""
        try:
            # Load and preprocess audio
            audio = self._preprocess_audio(audio_path)

            # Transcription options
            options = {
                "language": language,
                "word_timestamps": enable_word_timestamps,
                "temperature": temperature,
                "condition_on_previous_text": False,
                "compression_ratio_threshold": 2.4,
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.6,
            }

            # Remove None values
            options = {k: v for k, v in options.items() if v is not None}

            # Transcribe
            result = self.model.transcribe(audio, **options)

            # Process results
            return self._process_results(result, enable_punctuation)

        except Exception as e:
            return {
                "error": f"Transcription failed: {str(e)}",
                "segments": [],
                "language": "unknown",
            }

    def _preprocess_audio(self, audio_path: str) -> str:
        """Preprocess audio for better transcription quality"""
        try:
            # Load audio
            audio, sr = librosa.load(audio_path, sr=16000)

            # Apply noise reduction if needed
            if len(audio) > 0:
                # Basic noise gate
                audio = self._apply_noise_gate(audio)

                # Normalize volume
                audio = librosa.util.normalize(audio)

            return audio

        except Exception as e:
            print(f"Audio preprocessing warning: {e}", file=sys.stderr)
            return audio_path  # Return original path if preprocessing fails

    def _apply_noise_gate(self, audio, threshold: float = 0.01):
        """Apply simple noise gate to reduce background noise"""
        # Calculate RMS energy
        rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]

        # Apply gate
        for i, energy in enumerate(rms):
            start_sample = i * 512
            end_sample = min(start_sample + 512, len(audio))
            if energy < threshold:
                audio[start_sample:end_sample] *= 0.1  # Reduce low-energy segments

        return audio

    def _process_results(self, result: dict, enable_punctuation: bool) -> dict[str, Any]:
        """Process Whisper results into standardized format"""
        segments = []

        for segment in result.get("segments", []):
            segment_data = {
                "text": segment["text"].strip(),
                "start": segment["start"],
                "end": segment["end"],
                "confidence": self._calculate_confidence(segment),
            }

            # Add word-level timestamps if available
            if "words" in segment:
                segment_data["words"] = [
                    {
                        "word": word["word"],
                        "start": word["start"],
                        "end": word["end"],
                        "confidence": word.get("probability", 0.8),
                    }
                    for word in segment["words"]
                ]

            # Apply punctuation enhancement if requested
            if enable_punctuation:
                segment_data["text"] = self._enhance_punctuation(segment_data["text"])

            segments.append(segment_data)

        return {
            "segments": segments,
            "language": result.get("language", "unknown"),
            "text": result.get("text", "").strip(),
        }

    def _calculate_confidence(self, segment: dict) -> float:
        """Calculate confidence score for segment"""
        # Use average log probability if available
        if "avg_logprob" in segment:
            # Convert log probability to confidence (0-1)
            return max(0.0, min(1.0, (segment["avg_logprob"] + 5) / 5))

        # Use no-speech probability as inverse confidence
        if "no_speech_prob" in segment:
            return 1.0 - segment["no_speech_prob"]

        # Default confidence
        return 0.8

    def _enhance_punctuation(self, text: str) -> str:
        """Enhance punctuation in transcribed text"""
        # Basic punctuation enhancement
        text = text.strip()

        # Capitalize first letter
        if text and text[0].islower():
            text = text[0].upper() + text[1:]

        # Add period if missing and text doesn't end with punctuation
        if text and text[-1] not in ".!?":
            text += "."

        # Capitalize after sentence endings
        import re

        text = re.sub(r"([.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)

        return text


def main():
    parser = argparse.ArgumentParser(description="Whisper Speech-to-Text Transcription")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--model", default="base", help="Whisper model to use")
    parser.add_argument("--language", help="Language code (e.g., 'en', 'es', 'fr')")
    parser.add_argument("--device", default="auto", help="Device to use (auto, cpu, cuda)")
    parser.add_argument(
        "--word-timestamps", action="store_true", help="Enable word-level timestamps"
    )
    parser.add_argument("--enable-punctuation", action="store_true", help="Enhance punctuation")
    parser.add_argument("--output-format", default="json", choices=["json", "txt", "srt", "vtt"])

    args = parser.parse_args()

    # Validate input file
    if not os.path.exists(args.audio):
        print(json.dumps({"error": f"Audio file not found: {args.audio}"}))
        sys.exit(1)

    try:
        # Initialize transcription engine
        transcriber = WhisperTranscription(args.model, args.device)

        # Perform transcription
        result = transcriber.transcribe_audio(
            args.audio,
            language=args.language,
            enable_word_timestamps=args.word_timestamps,
            enable_punctuation=args.enable_punctuation,
        )

        # Output result
        if args.output_format == "json":
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif args.output_format == "txt":
            print(result.get("text", ""))
        else:
            # For SRT/VTT, output segments with timestamps
            for i, segment in enumerate(result.get("segments", []), 1):
                start_time = segment["start"]
                end_time = segment["end"]
                text = segment["text"]

                if args.output_format == "srt":
                    print(f"{i}")
                    print(
                        f"{format_timestamp_srt(start_time)} --> {format_timestamp_srt(end_time)}"
                    )
                    print(text)
                    print()
                elif args.output_format == "vtt":
                    if i == 1:
                        print("WEBVTT")
                        print()
                    print(
                        f"{format_timestamp_vtt(start_time)} --> {format_timestamp_vtt(end_time)}"
                    )
                    print(text)
                    print()

    except Exception as e:
        print(json.dumps({"error": f"Transcription failed: {str(e)}"}))
        sys.exit(1)


def format_timestamp_srt(seconds: float) -> str:
    """Format timestamp for SRT format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format timestamp for VTT format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


if __name__ == "__main__":
    main()
