"""EXIF metadata scrubbing enricher."""

from typing import Any, Dict, Optional

from .base import BaseEnricher, EnricherResult, EnrichmentContext


class ExifScrubEnricher(BaseEnricher):
    """
    Scrubs EXIF metadata from images to protect privacy.

    Removes:
    - GPS coordinates
    - Camera make/model
    - Software information
    - Timestamps
    - User comments

    This is a stub implementation that simulates EXIF scrubbing.
    In production, integrate with Pillow (PIL) or exiftool.
    """

    # Sensitive EXIF tags to remove
    SENSITIVE_TAGS = [
        'GPSInfo',
        'GPSLatitude',
        'GPSLongitude',
        'GPSAltitude',
        'GPSTimeStamp',
        'Make',
        'Model',
        'Software',
        'DateTime',
        'DateTimeOriginal',
        'DateTimeDigitized',
        'UserComment',
        'ImageDescription',
        'Artist',
        'Copyright',
        'CameraSerialNumber',
        'LensModel',
        'OwnerName',
    ]

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.preserve_orientation = self.config.get('preserve_orientation', True)
        self.remove_all = self.config.get('remove_all', False)
        self.custom_remove_tags = self.config.get('custom_remove_tags', [])

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains image references."""
        if not self.enabled:
            return False

        # Check for image-related fields
        image_fields = [
            'image',
            'image_url',
            'image_path',
            'photo',
            'photo_url',
            'attachment',
            'media',
        ]

        for field in image_fields:
            if field in data and data[field]:
                return True

        # Check for explicit EXIF data
        if 'exif' in data or 'metadata' in data:
            return True

        return False

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Scrub EXIF metadata from images."""
        result = EnricherResult(success=True)

        scrub_data = {}

        try:
            # Find image references
            image_refs = self._extract_image_references(data)

            if not image_refs:
                result.add_warning("No image references found")
                return result

            # Scrub each image
            for field_name, image_ref in image_refs.items():
                scrub_info = self._scrub_exif(image_ref)
                scrub_data[f"{field_name}_scrubbed"] = scrub_info

                # Add provenance metadata
                result.metadata[f"{field_name}_exif_scrubbed"] = True
                result.metadata[f"{field_name}_tags_removed"] = len(
                    scrub_info.get('removed_tags', [])
                )

            result.add_enrichment('exif_scrub', scrub_data)

        except Exception as e:
            result.add_error(f"EXIF scrubbing failed: {str(e)}")

        return result

    def _extract_image_references(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Extract image references from data."""
        image_refs = {}

        # Common image field names
        image_fields = [
            'image',
            'image_url',
            'image_path',
            'photo',
            'photo_url',
            'attachment',
            'media',
        ]

        for field in image_fields:
            if field in data and data[field]:
                image_refs[field] = data[field]

        return image_refs

    def _scrub_exif(self, image_ref: Any) -> Dict[str, Any]:
        """
        Scrub EXIF data from image.

        STUB IMPLEMENTATION: Simulates EXIF scrubbing.
        In production, use Pillow (PIL) or exiftool to actually scrub EXIF data.
        """
        # Determine what tags would be removed
        tags_to_remove = self.SENSITIVE_TAGS.copy()

        if self.custom_remove_tags:
            tags_to_remove.extend(self.custom_remove_tags)

        if self.remove_all:
            tags_to_remove.append('*')  # Remove all tags

        # Simulate scrubbing
        scrubbed_data = {
            'original_reference': str(image_ref),
            'removed_tags': tags_to_remove if not self.remove_all else ['*'],
            'preserved_tags': ['Orientation'] if self.preserve_orientation else [],
            'scrubbed_at': 'timestamp',
            'is_stub': True,
            'enricher': 'exif-scrub-stub-v1',
            'note': 'Integrate with Pillow or exiftool for actual EXIF scrubbing',
        }

        # In production, this would:
        # 1. Load the image from image_ref
        # 2. Read EXIF data
        # 3. Remove sensitive tags
        # 4. Optionally preserve orientation
        # 5. Write cleaned image
        # 6. Return new image reference

        return scrubbed_data
