"""OCR and Speech-to-Text enricher hooks."""

from typing import Any, Dict, Optional

from .base import BaseEnricher, EnricherResult, EnrichmentContext


class OCREnricher(BaseEnricher):
    """
    Optical Character Recognition (OCR) enricher.

    Extracts text from images and documents.
    This is a stub that integrates with existing AI engine via hooks.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.ai_engine_url = self.config.get('ai_engine_url', 'http://localhost:8000')
        self.confidence_threshold = self.config.get('confidence_threshold', 0.7)
        self.languages = self.config.get('languages', ['eng'])  # Tesseract language codes

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains images or documents for OCR."""
        if not self.enabled:
            return False

        # Check for image/document fields
        ocr_fields = [
            'image',
            'image_url',
            'document',
            'document_url',
            'pdf',
            'scan',
            'attachment',
        ]

        for field in ocr_fields:
            if field in data and data[field]:
                return True

        return False

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Extract text from images/documents via OCR."""
        result = EnricherResult(success=True)

        ocr_data = {}

        try:
            # Find OCR targets
            ocr_targets = self._extract_ocr_targets(data)

            if not ocr_targets:
                result.add_warning("No OCR targets found")
                return result

            # Process each target
            for field_name, target_ref in ocr_targets.items():
                ocr_result = self._process_ocr(target_ref)
                ocr_data[f"{field_name}_ocr"] = ocr_result

                # Add provenance metadata
                result.metadata[f"{field_name}_ocr_processed"] = True
                result.metadata[f"{field_name}_text_length"] = len(
                    ocr_result.get('text', '')
                )

            result.add_enrichment('ocr', ocr_data)

        except Exception as e:
            result.add_error(f"OCR processing failed: {str(e)}")

        return result

    def _extract_ocr_targets(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Extract OCR targets from data."""
        targets = {}

        ocr_fields = [
            'image',
            'image_url',
            'document',
            'document_url',
            'pdf',
            'scan',
            'attachment',
        ]

        for field in ocr_fields:
            if field in data and data[field]:
                targets[field] = data[field]

        return targets

    def _process_ocr(self, target_ref: Any) -> Dict[str, Any]:
        """
        Process OCR on target.

        STUB IMPLEMENTATION: Returns dummy OCR result.
        In production, this would call the AI engine's OCR endpoint.

        Integration points:
        - POST {ai_engine_url}/ocr/extract
        - Body: {'image_url': target_ref, 'languages': self.languages}
        - Response: {'text': str, 'confidence': float, 'words': [...]}
        """
        return {
            'text': 'This is sample OCR extracted text.',
            'confidence': 0.85,
            'language': 'eng',
            'word_count': 6,
            'is_stub': True,
            'enricher': 'ocr-stub-v1',
            'note': 'Integrate with AI engine OCR endpoint',
            'ai_engine_url': self.ai_engine_url,
        }


class STTEnricher(BaseEnricher):
    """
    Speech-to-Text (STT) enricher.

    Transcribes audio content to text.
    This is a stub that integrates with existing AI engine via hooks.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.ai_engine_url = self.config.get('ai_engine_url', 'http://localhost:8000')
        self.confidence_threshold = self.config.get('confidence_threshold', 0.7)
        self.language = self.config.get('language', 'en-US')
        self.enable_diarization = self.config.get('enable_diarization', False)

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains audio for transcription."""
        if not self.enabled:
            return False

        # Check for audio fields
        audio_fields = [
            'audio',
            'audio_url',
            'recording',
            'voice',
            'speech',
            'media',
        ]

        for field in audio_fields:
            if field in data and data[field]:
                return True

        return False

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Transcribe audio to text via STT."""
        result = EnricherResult(success=True)

        stt_data = {}

        try:
            # Find audio targets
            audio_targets = self._extract_audio_targets(data)

            if not audio_targets:
                result.add_warning("No audio targets found")
                return result

            # Process each target
            for field_name, target_ref in audio_targets.items():
                stt_result = self._process_stt(target_ref)
                stt_data[f"{field_name}_transcript"] = stt_result

                # Add provenance metadata
                result.metadata[f"{field_name}_stt_processed"] = True
                result.metadata[f"{field_name}_transcript_length"] = len(
                    stt_result.get('transcript', '')
                )

            result.add_enrichment('stt', stt_data)

        except Exception as e:
            result.add_error(f"STT processing failed: {str(e)}")

        return result

    def _extract_audio_targets(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Extract audio targets from data."""
        targets = {}

        audio_fields = [
            'audio',
            'audio_url',
            'recording',
            'voice',
            'speech',
            'media',
        ]

        for field in audio_fields:
            if field in data and data[field]:
                targets[field] = data[field]

        return targets

    def _process_stt(self, target_ref: Any) -> Dict[str, Any]:
        """
        Process STT on audio.

        STUB IMPLEMENTATION: Returns dummy transcription.
        In production, this would call the AI engine's STT endpoint.

        Integration points:
        - POST {ai_engine_url}/stt/transcribe
        - Body: {'audio_url': target_ref, 'language': self.language, 'diarization': self.enable_diarization}
        - Response: {'transcript': str, 'confidence': float, 'speakers': [...]}
        """
        return {
            'transcript': 'This is a sample speech-to-text transcription.',
            'confidence': 0.88,
            'language': self.language,
            'duration_seconds': 30.5,
            'word_count': 8,
            'speakers': [
                {'speaker_id': 'SPEAKER_00', 'segments': [{'start': 0.0, 'end': 30.5}]}
            ]
            if self.enable_diarization
            else None,
            'is_stub': True,
            'enricher': 'stt-stub-v1',
            'note': 'Integrate with AI engine STT endpoint',
            'ai_engine_url': self.ai_engine_url,
        }
