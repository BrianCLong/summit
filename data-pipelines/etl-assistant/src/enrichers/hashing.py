"""Content hashing enricher."""

import hashlib
import json
from typing import Any, Dict, Optional

from .base import BaseEnricher, EnricherResult, EnrichmentContext


class HashingEnricher(BaseEnricher):
    """
    Generates content hashes for data integrity and deduplication.

    Supports:
    - SHA-256 hashes for general content
    - Perceptual hashes (pHash) for images (stub)
    - Fuzzy hashes (ssdeep) for similarity matching (stub)

    This is a working implementation for standard hashing,
    with stubs for advanced hashing (pHash, ssdeep).
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.hash_algorithms = self.config.get('hash_algorithms', ['sha256'])
        self.hash_fields = self.config.get('hash_fields', [])  # Specific fields to hash
        self.hash_all_content = self.config.get('hash_all_content', True)
        self.enable_perceptual = self.config.get('enable_perceptual', False)
        self.enable_fuzzy = self.config.get('enable_fuzzy', False)

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains hashable content."""
        if not self.enabled:
            return False

        # Always can hash data
        return bool(data)

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Generate hashes for content."""
        result = EnricherResult(success=True)

        hash_data = {}

        try:
            # Generate content hash of entire record
            if self.hash_all_content:
                content_hash = self._hash_content(data)
                hash_data['content_hash'] = content_hash
                result.metadata['content_hash_algorithm'] = 'sha256'

            # Hash specific fields
            if self.hash_fields:
                field_hashes = {}
                for field in self.hash_fields:
                    if field in data:
                        field_hash = self._hash_value(data[field])
                        field_hashes[f"{field}_hash"] = field_hash
                hash_data['field_hashes'] = field_hashes

            # Perceptual hashing for images (stub)
            if self.enable_perceptual:
                if 'image' in data or 'image_url' in data:
                    phash = self._perceptual_hash(data)
                    hash_data['perceptual_hash'] = phash
                    result.metadata['perceptual_hash_generated'] = True

            # Fuzzy hashing for similarity matching (stub)
            if self.enable_fuzzy:
                fuzzy_hash = self._fuzzy_hash(data)
                hash_data['fuzzy_hash'] = fuzzy_hash
                result.metadata['fuzzy_hash_generated'] = True

            result.add_enrichment('hashes', hash_data)

        except Exception as e:
            result.add_error(f"Hashing failed: {str(e)}")

        return result

    def _hash_content(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate content hash of data."""
        hashes = {}

        # Serialize data to stable JSON format
        content = json.dumps(data, sort_keys=True, default=str)

        # Generate hashes with different algorithms
        for algorithm in self.hash_algorithms:
            if algorithm == 'sha256':
                hash_obj = hashlib.sha256(content.encode('utf-8'))
                hashes['sha256'] = hash_obj.hexdigest()
            elif algorithm == 'sha512':
                hash_obj = hashlib.sha512(content.encode('utf-8'))
                hashes['sha512'] = hash_obj.hexdigest()
            elif algorithm == 'md5':
                # MD5 is weak but still useful for non-security purposes
                hash_obj = hashlib.md5(content.encode('utf-8'))
                hashes['md5'] = hash_obj.hexdigest()

        return hashes

    def _hash_value(self, value: Any) -> str:
        """Hash a single value."""
        # Convert value to string
        value_str = str(value) if not isinstance(value, str) else value

        # Generate SHA-256 hash
        hash_obj = hashlib.sha256(value_str.encode('utf-8'))
        return hash_obj.hexdigest()

    def _perceptual_hash(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate perceptual hash for images.

        STUB IMPLEMENTATION: Returns dummy pHash.
        In production, use ImageHash library with pHash, dHash, or aHash.
        """
        return {
            'phash': '0000000000000000',  # Dummy 64-bit hash
            'algorithm': 'phash-stub',
            'is_stub': True,
            'note': 'Integrate with ImageHash library for real pHash',
        }

    def _fuzzy_hash(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate fuzzy hash for similarity matching.

        STUB IMPLEMENTATION: Returns dummy ssdeep-like hash.
        In production, use ssdeep or TLSH library.
        """
        # Simple character frequency-based fuzzy hash simulation
        content = json.dumps(data, sort_keys=True, default=str)
        char_freq = {}
        for char in content:
            char_freq[char] = char_freq.get(char, 0) + 1

        # Create a simple signature
        signature = ''.join([f"{ord(c):02x}" for c in sorted(char_freq.keys())[:8]])

        return {
            'fuzzy_hash': f"3:{signature}:{signature}",  # ssdeep-like format
            'algorithm': 'fuzzy-stub',
            'is_stub': True,
            'note': 'Integrate with ssdeep or TLSH for real fuzzy hashing',
        }
