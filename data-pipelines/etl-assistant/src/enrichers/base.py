"""Base enricher interface for ETL pipeline."""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EnrichmentContext:
    """Context for enrichment operations."""

    tenant_id: str
    source_name: str
    record_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


@dataclass
class EnricherResult:
    """Result of an enrichment operation."""

    success: bool
    enriched_data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0

    def add_enrichment(self, key: str, value: Any) -> None:
        """Add an enrichment field."""
        self.enriched_data[key] = value

    def add_error(self, error: str) -> None:
        """Add an error message."""
        self.errors.append(error)
        self.success = False

    def add_warning(self, warning: str) -> None:
        """Add a warning message."""
        self.warnings.append(warning)


class BaseEnricher(ABC):
    """
    Base class for all enrichers.

    Enrichers transform or augment data as it flows through the ETL pipeline.
    Each enricher should:
    - Be stateless (no instance state between enrichments)
    - Be fast (<10ms per record for most operations)
    - Handle errors gracefully
    - Emit metrics for observability
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.metrics = {
            'total_enrichments': 0,
            'successful_enrichments': 0,
            'failed_enrichments': 0,
            'total_duration_ms': 0.0,
        }

    @abstractmethod
    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """
        Enrich the provided data.

        Args:
            data: The data to enrich
            context: Enrichment context with metadata

        Returns:
            EnricherResult with enriched data
        """
        raise NotImplementedError

    @abstractmethod
    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """
        Check if this enricher can process the given data.

        Args:
            data: The data to check

        Returns:
            True if this enricher can process the data
        """
        raise NotImplementedError

    def enrich_with_timing(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """
        Enrich data with automatic timing and metrics.

        Args:
            data: The data to enrich
            context: Enrichment context

        Returns:
            EnricherResult with timing information
        """
        start_time = time.time()

        self.metrics['total_enrichments'] += 1

        try:
            result = self.enrich(data, context)
            result.duration_ms = (time.time() - start_time) * 1000

            if result.success:
                self.metrics['successful_enrichments'] += 1
            else:
                self.metrics['failed_enrichments'] += 1

            self.metrics['total_duration_ms'] += result.duration_ms

            return result

        except Exception as e:
            self.metrics['failed_enrichments'] += 1
            duration_ms = (time.time() - start_time) * 1000
            self.metrics['total_duration_ms'] += duration_ms

            return EnricherResult(
                success=False,
                errors=[f"Enrichment failed: {str(e)}"],
                duration_ms=duration_ms,
            )

    def get_metrics(self) -> Dict[str, Any]:
        """Get enricher metrics."""
        avg_duration = 0.0
        if self.metrics['total_enrichments'] > 0:
            avg_duration = self.metrics['total_duration_ms'] / self.metrics['total_enrichments']

        return {
            **self.metrics,
            'average_duration_ms': avg_duration,
            'success_rate': (
                self.metrics['successful_enrichments'] / self.metrics['total_enrichments']
                if self.metrics['total_enrichments'] > 0
                else 0.0
            ),
        }

    def reset_metrics(self) -> None:
        """Reset enricher metrics."""
        self.metrics = {
            'total_enrichments': 0,
            'successful_enrichments': 0,
            'failed_enrichments': 0,
            'total_duration_ms': 0.0,
        }
