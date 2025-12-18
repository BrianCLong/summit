"""Unit tests for enrichers."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from enrichers import (
    BaseEnricher,
    EnrichmentContext,
    GeoIPEnricher,
    LanguageEnricher,
    HashingEnricher,
    ExifScrubEnricher,
    OCREnricher,
    STTEnricher,
)


class TestBaseEnricher:
    """Test base enricher functionality."""

    def test_enrichment_context_creation(self):
        """Test creating enrichment context."""
        context = EnrichmentContext(
            tenant_id='tenant_123',
            source_name='test_source',
            record_id='record_1',
        )

        assert context.tenant_id == 'tenant_123'
        assert context.source_name == 'test_source'
        assert context.record_id == 'record_1'
        assert context.timestamp > 0


class TestGeoIPEnricher:
    """Test GeoIP enricher."""

    def test_can_enrich_with_ip_field(self):
        """Test can_enrich detects IP addresses."""
        enricher = GeoIPEnricher()

        data = {'ip': '8.8.8.8', 'name': 'Google DNS'}
        assert enricher.can_enrich(data) is True

    def test_cannot_enrich_without_ip(self):
        """Test can_enrich returns False without IP."""
        enricher = GeoIPEnricher()

        data = {'name': 'John Doe', 'email': 'john@example.com'}
        assert enricher.can_enrich(data) is False

    def test_enrich_adds_geo_data(self):
        """Test enrich adds geographical data."""
        enricher = GeoIPEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'ip': '8.8.8.8', 'name': 'Google DNS'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'geo' in result.enriched_data
        assert 'ip_geo' in result.enriched_data['geo']

        geo_info = result.enriched_data['geo']['ip_geo']
        assert geo_info['ip'] == '8.8.8.8'
        assert 'country_code' in geo_info
        assert 'city' in geo_info
        assert 'latitude' in geo_info
        assert 'longitude' in geo_info

    def test_enrich_with_timing(self):
        """Test enrich_with_timing records duration."""
        enricher = GeoIPEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'ip': '8.8.8.8'}
        result = enricher.enrich_with_timing(data, context)

        assert result.duration_ms > 0
        assert result.duration_ms < 100  # Should be fast for stub

    def test_metrics_tracking(self):
        """Test metrics are tracked."""
        enricher = GeoIPEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        # Process multiple records
        for i in range(5):
            data = {'ip': f'8.8.8.{i}'}
            enricher.enrich_with_timing(data, context)

        metrics = enricher.get_metrics()
        assert metrics['total_enrichments'] == 5
        assert metrics['successful_enrichments'] == 5
        assert metrics['failed_enrichments'] == 0
        assert metrics['average_duration_ms'] > 0


class TestLanguageEnricher:
    """Test language enricher."""

    def test_can_enrich_with_text(self):
        """Test can_enrich detects text fields."""
        enricher = LanguageEnricher()

        data = {'text': 'This is a long enough text to detect language'}
        assert enricher.can_enrich(data) is True

    def test_cannot_enrich_short_text(self):
        """Test can_enrich rejects short text."""
        enricher = LanguageEnricher()

        data = {'text': 'Hi'}
        assert enricher.can_enrich(data) is False

    def test_enrich_detects_language(self):
        """Test enrich detects language."""
        enricher = LanguageEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'text': 'Bonjour, ceci est un message en français avec beaucoup de mots.'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'language' in result.enriched_data
        assert 'text_language' in result.enriched_data['language']

        lang_info = result.enriched_data['language']['text_language']
        assert 'language' in lang_info
        assert 'confidence' in lang_info
        assert 'script' in lang_info

    def test_english_default(self):
        """Test English is default for unrecognized text."""
        enricher = LanguageEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'content': 'Random text without language markers xyz abc def'}
        result = enricher.enrich(data, context)

        assert result.success is True
        lang_info = result.enriched_data['language']['content_language']
        assert lang_info['language'] == 'en'


class TestHashingEnricher:
    """Test hashing enricher."""

    def test_can_enrich_any_data(self):
        """Test can_enrich accepts any data."""
        enricher = HashingEnricher()

        data = {'field': 'value'}
        assert enricher.can_enrich(data) is True

    def test_enrich_generates_content_hash(self):
        """Test enrich generates content hash."""
        enricher = HashingEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'name': 'John Doe', 'email': 'john@example.com'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'hashes' in result.enriched_data
        assert 'content_hash' in result.enriched_data['hashes']

        content_hash = result.enriched_data['hashes']['content_hash']
        assert 'sha256' in content_hash
        assert len(content_hash['sha256']) == 64  # SHA-256 hex length

    def test_hash_consistency(self):
        """Test same data produces same hash."""
        enricher = HashingEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'name': 'John Doe', 'email': 'john@example.com'}

        result1 = enricher.enrich(data, context)
        result2 = enricher.enrich(data, context)

        hash1 = result1.enriched_data['hashes']['content_hash']['sha256']
        hash2 = result2.enriched_data['hashes']['content_hash']['sha256']

        assert hash1 == hash2

    def test_different_data_different_hash(self):
        """Test different data produces different hash."""
        enricher = HashingEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data1 = {'name': 'John Doe'}
        data2 = {'name': 'Jane Doe'}

        result1 = enricher.enrich(data1, context)
        result2 = enricher.enrich(data2, context)

        hash1 = result1.enriched_data['hashes']['content_hash']['sha256']
        hash2 = result2.enriched_data['hashes']['content_hash']['sha256']

        assert hash1 != hash2


class TestExifScrubEnricher:
    """Test EXIF scrub enricher."""

    def test_can_enrich_with_image_field(self):
        """Test can_enrich detects image fields."""
        enricher = ExifScrubEnricher()

        data = {'image_url': 'http://example.com/photo.jpg'}
        assert enricher.can_enrich(data) is True

    def test_cannot_enrich_without_image(self):
        """Test can_enrich returns False without image."""
        enricher = ExifScrubEnricher()

        data = {'name': 'John Doe'}
        assert enricher.can_enrich(data) is False

    def test_enrich_scrubs_exif(self):
        """Test enrich scrubs EXIF data."""
        enricher = ExifScrubEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'image_url': 'http://example.com/photo.jpg'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'exif_scrub' in result.enriched_data
        assert 'image_url_scrubbed' in result.enriched_data['exif_scrub']

        scrub_info = result.enriched_data['exif_scrub']['image_url_scrubbed']
        assert 'removed_tags' in scrub_info
        assert len(scrub_info['removed_tags']) > 0


class TestOCREnricher:
    """Test OCR enricher."""

    def test_can_enrich_with_image(self):
        """Test can_enrich detects images for OCR."""
        enricher = OCREnricher()

        data = {'document_url': 'http://example.com/doc.pdf'}
        assert enricher.can_enrich(data) is True

    def test_enrich_extracts_text(self):
        """Test enrich extracts text via OCR."""
        enricher = OCREnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'document_url': 'http://example.com/doc.pdf'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'ocr' in result.enriched_data
        assert 'document_url_ocr' in result.enriched_data['ocr']

        ocr_result = result.enriched_data['ocr']['document_url_ocr']
        assert 'text' in ocr_result
        assert 'confidence' in ocr_result


class TestSTTEnricher:
    """Test STT enricher."""

    def test_can_enrich_with_audio(self):
        """Test can_enrich detects audio for STT."""
        enricher = STTEnricher()

        data = {'audio_url': 'http://example.com/recording.mp3'}
        assert enricher.can_enrich(data) is True

    def test_enrich_transcribes_audio(self):
        """Test enrich transcribes audio."""
        enricher = STTEnricher()
        context = EnrichmentContext(tenant_id='test', source_name='test')

        data = {'audio_url': 'http://example.com/recording.mp3'}
        result = enricher.enrich(data, context)

        assert result.success is True
        assert 'stt' in result.enriched_data
        assert 'audio_url_transcript' in result.enriched_data['stt']

        transcript = result.enriched_data['stt']['audio_url_transcript']
        assert 'transcript' in transcript
        assert 'confidence' in transcript


def run_tests():
    """Run all tests."""
    import pytest

    pytest.main([__file__, '-v'])


if __name__ == '__main__':
    run_tests()
