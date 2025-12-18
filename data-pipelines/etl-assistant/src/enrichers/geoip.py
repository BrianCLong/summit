"""GeoIP enricher for IP address geolocation."""

import re
from typing import Any, Dict, Optional

from .base import BaseEnricher, EnricherResult, EnrichmentContext


class GeoIPEnricher(BaseEnricher):
    """
    Enriches IP addresses with geographical information.

    Adds:
    - country
    - city
    - latitude/longitude
    - timezone
    - ASN information

    This is a stub implementation that returns dummy data.
    In production, integrate with MaxMind GeoIP2 or similar service.
    """

    # IP address pattern
    IP_PATTERN = re.compile(
        r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
        r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    )

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.max_latency_ms = self.config.get('max_latency_ms', 10)

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains IP addresses."""
        if not self.enabled:
            return False

        # Check for common IP address fields
        ip_fields = ['ip', 'ip_address', 'source_ip', 'dest_ip', 'client_ip', 'server_ip']

        for field in ip_fields:
            if field in data and data[field]:
                return True

        # Check all string values for IP patterns
        for value in data.values():
            if isinstance(value, str) and self.IP_PATTERN.search(value):
                return True

        return False

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Enrich IP addresses with geo data."""
        result = EnricherResult(success=True)

        # Find IP addresses in data
        ip_addresses = self._extract_ip_addresses(data)

        if not ip_addresses:
            result.add_warning("No IP addresses found in data")
            return result

        # Enrich each IP address
        geo_data = {}
        for field_name, ip_address in ip_addresses.items():
            try:
                geo_info = self._lookup_geoip(ip_address)
                geo_data[f"{field_name}_geo"] = geo_info

                # Add provenance metadata
                result.metadata[f"{field_name}_enriched"] = True
                result.metadata[f"{field_name}_original"] = ip_address

            except Exception as e:
                result.add_warning(f"Failed to enrich {field_name}: {str(e)}")

        # Add geo data to result
        result.add_enrichment('geo', geo_data)

        return result

    def _extract_ip_addresses(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Extract IP addresses from data."""
        ip_addresses = {}

        # Common IP field names
        ip_fields = ['ip', 'ip_address', 'source_ip', 'dest_ip', 'client_ip', 'server_ip']

        for field in ip_fields:
            if field in data and data[field]:
                value = str(data[field])
                if self.IP_PATTERN.match(value):
                    ip_addresses[field] = value

        return ip_addresses

    def _lookup_geoip(self, ip_address: str) -> Dict[str, Any]:
        """
        Lookup geographical information for an IP address.

        STUB IMPLEMENTATION: Returns dummy data.
        In production, use MaxMind GeoIP2, IP2Location, or similar service.
        """
        # For now, return dummy data based on IP range
        octets = [int(x) for x in ip_address.split('.')]
        first_octet = octets[0]

        # Dummy data generation based on first octet
        if first_octet < 64:
            country = "US"
            city = "San Francisco"
            lat, lon = 37.7749, -122.4194
            timezone = "America/Los_Angeles"
        elif first_octet < 128:
            country = "GB"
            city = "London"
            lat, lon = 51.5074, -0.1278
            timezone = "Europe/London"
        elif first_octet < 192:
            country = "JP"
            city = "Tokyo"
            lat, lon = 35.6762, 139.6503
            timezone = "Asia/Tokyo"
        else:
            country = "DE"
            city = "Berlin"
            lat, lon = 52.5200, 13.4050
            timezone = "Europe/Berlin"

        return {
            'ip': ip_address,
            'country_code': country,
            'city': city,
            'latitude': lat,
            'longitude': lon,
            'timezone': timezone,
            'asn': 'AS15169',  # Dummy ASN
            'asn_org': 'Example ISP',
            'is_stub': True,  # Mark as stub data
            'enricher': 'geoip-stub-v1',
        }
