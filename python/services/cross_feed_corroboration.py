"""
Cross-Feed Corroboration Service - Threat Intel v3
Corroborates threat intel across multiple feeds with time-decay weighting
"""

import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import logging

logger = logging.getLogger(__name__)


class FeedType(Enum):
    MALWARE = "malware"
    C2 = "c2"
    PHISHING = "phishing"
    VULNERABILITY = "vulnerability"
    REPUTATION = "reputation"


@dataclass
class ThreatIndicator:
    """Threat indicator from a feed"""
    indicator_value: str  # IP, domain, hash, etc.
    indicator_type: str  # ip, domain, md5, sha256, etc.
    feed_id: str
    feed_name: str
    confidence: float  # 0.0 - 1.0
    severity: str  # low, medium, high, critical
    first_seen: datetime
    last_seen: datetime
    tags: List[str]
    context: Dict


@dataclass
class CorroborationResult:
    """Result of cross-feed corroboration"""
    indicator_value: str
    indicator_type: str
    corroboration_score: float  # 0.0 - 1.0
    corroborating_feeds: List[str]
    feed_count: int
    weighted_confidence: float
    time_decay_factor: float
    consensus_tags: List[str]
    first_seen_global: datetime
    last_seen_global: datetime
    verdict: str  # benign, suspicious, malicious, critical


class CrossFeedCorroboration:
    """
    Cross-feed corroboration service

    Features:
    - Multi-feed aggregation
    - Time-decay weighting
    - Consensus tag extraction
    - Weighted confidence scoring
    - Feed reliability weighting
    """

    def __init__(self, feed_endpoints: Dict[str, str],
                 feed_weights: Dict[str, float],
                 time_decay_days: int = 30):
        self.feed_endpoints = feed_endpoints
        self.feed_weights = feed_weights  # Reliability weights per feed
        self.time_decay_days = time_decay_days
        self.indicator_cache: Dict[str, List[ThreatIndicator]] = {}

    async def corroborate(self, indicator_value: str,
                         indicator_type: str) -> CorroborationResult:
        """
        Corroborate indicator across multiple threat feeds

        Args:
            indicator_value: The indicator to check (IP, hash, etc.)
            indicator_type: Type of indicator

        Returns:
            CorroborationResult with aggregated intelligence
        """
        # Fetch from all feeds in parallel
        indicators = await self._fetch_from_feeds(indicator_value, indicator_type)

        if not indicators:
            return self._create_empty_result(indicator_value, indicator_type)

        # Calculate corroboration score
        corr_score = self._calculate_corroboration_score(indicators)

        # Extract consensus tags
        consensus_tags = self._extract_consensus_tags(indicators)

        # Calculate weighted confidence
        weighted_conf = self._calculate_weighted_confidence(indicators)

        # Calculate time decay factor
        time_decay = self._calculate_time_decay(indicators)

        # Determine verdict
        verdict = self._determine_verdict(corr_score, weighted_conf, len(indicators))

        # Get global first/last seen
        first_seen = min(ind.first_seen for ind in indicators)
        last_seen = max(ind.last_seen for ind in indicators)

        return CorroborationResult(
            indicator_value=indicator_value,
            indicator_type=indicator_type,
            corroboration_score=corr_score,
            corroborating_feeds=[ind.feed_id for ind in indicators],
            feed_count=len(indicators),
            weighted_confidence=weighted_conf,
            time_decay_factor=time_decay,
            consensus_tags=consensus_tags,
            first_seen_global=first_seen,
            last_seen_global=last_seen,
            verdict=verdict
        )

    async def _fetch_from_feeds(self, indicator_value: str,
                                indicator_type: str) -> List[ThreatIndicator]:
        """Fetch indicator from all configured feeds in parallel"""
        tasks = []

        async with aiohttp.ClientSession() as session:
            for feed_id, endpoint in self.feed_endpoints.items():
                task = self._fetch_from_feed(
                    session, feed_id, endpoint, indicator_value, indicator_type
                )
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out errors and None results
        indicators = []
        for result in results:
            if isinstance(result, ThreatIndicator):
                indicators.append(result)
            elif isinstance(result, Exception):
                logger.warning(f"Feed fetch error: {result}")

        return indicators

    async def _fetch_from_feed(self, session: aiohttp.ClientSession,
                               feed_id: str, endpoint: str,
                               indicator_value: str,
                               indicator_type: str) -> Optional[ThreatIndicator]:
        """Fetch indicator from a single feed"""
        try:
            url = f"{endpoint}/{indicator_type}/{indicator_value}"

            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 404:
                    return None  # Not found in this feed

                if resp.status != 200:
                    raise Exception(f"HTTP {resp.status} from {feed_id}")

                data = await resp.json()

                return ThreatIndicator(
                    indicator_value=indicator_value,
                    indicator_type=indicator_type,
                    feed_id=feed_id,
                    feed_name=data.get('feed_name', feed_id),
                    confidence=float(data.get('confidence', 0.5)),
                    severity=data.get('severity', 'medium'),
                    first_seen=datetime.fromisoformat(data.get('first_seen')),
                    last_seen=datetime.fromisoformat(data.get('last_seen')),
                    tags=data.get('tags', []),
                    context=data.get('context', {})
                )

        except Exception as e:
            logger.error(f"Error fetching from {feed_id}: {e}")
            return None

    def _calculate_corroboration_score(self, indicators: List[ThreatIndicator]) -> float:
        """
        Calculate corroboration score based on:
        1. Number of feeds (more is better)
        2. Feed reliability weights
        3. Agreement on severity
        """
        if not indicators:
            return 0.0

        # Base score: number of feeds / total possible feeds
        base_score = len(indicators) / len(self.feed_endpoints)

        # Weight by feed reliability
        reliability_weights = [
            self.feed_weights.get(ind.feed_id, 0.5) for ind in indicators
        ]
        weighted_feed_score = sum(reliability_weights) / len(self.feed_endpoints)

        # Severity agreement bonus
        severity_counts = {}
        for ind in indicators:
            severity_counts[ind.severity] = severity_counts.get(ind.severity, 0) + 1

        max_severity_count = max(severity_counts.values())
        severity_agreement = max_severity_count / len(indicators)

        # Combined score
        corr_score = (base_score * 0.4) + (weighted_feed_score * 0.4) + (severity_agreement * 0.2)

        return min(corr_score, 1.0)

    def _calculate_weighted_confidence(self, indicators: List[ThreatIndicator]) -> float:
        """Calculate weighted confidence using feed reliability"""
        if not indicators:
            return 0.0

        weighted_sum = 0.0
        weight_total = 0.0

        for ind in indicators:
            feed_weight = self.feed_weights.get(ind.feed_id, 0.5)
            weighted_sum += ind.confidence * feed_weight
            weight_total += feed_weight

        return weighted_sum / weight_total if weight_total > 0 else 0.0

    def _calculate_time_decay(self, indicators: List[ThreatIndicator]) -> float:
        """Calculate time decay factor (newer is better)"""
        if not indicators:
            return 0.0

        now = datetime.utcnow()
        decay_factors = []

        for ind in indicators:
            days_old = (now - ind.last_seen).days

            # Exponential decay: e^(-days / decay_days)
            import math
            decay = math.exp(-days_old / self.time_decay_days)
            decay_factors.append(decay)

        return sum(decay_factors) / len(decay_factors)

    def _extract_consensus_tags(self, indicators: List[ThreatIndicator],
                                threshold: float = 0.5) -> List[str]:
        """Extract tags that appear in >= threshold of feeds"""
        if not indicators:
            return []

        # Count tag occurrences
        tag_counts = {}
        for ind in indicators:
            for tag in ind.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # Filter by threshold
        min_count = int(len(indicators) * threshold)
        consensus_tags = [
            tag for tag, count in tag_counts.items()
            if count >= min_count
        ]

        return sorted(consensus_tags)

    def _determine_verdict(self, corr_score: float,
                          weighted_conf: float,
                          feed_count: int) -> str:
        """Determine final verdict based on corroboration and confidence"""

        # Critical: High corroboration + high confidence + multiple feeds
        if corr_score >= 0.8 and weighted_conf >= 0.8 and feed_count >= 3:
            return 'critical'

        # Malicious: Good corroboration + good confidence
        elif corr_score >= 0.6 and weighted_conf >= 0.6:
            return 'malicious'

        # Suspicious: Some corroboration or moderate confidence
        elif corr_score >= 0.4 or weighted_conf >= 0.5:
            return 'suspicious'

        # Benign: Low corroboration and low confidence
        else:
            return 'benign'

    def _create_empty_result(self, indicator_value: str,
                            indicator_type: str) -> CorroborationResult:
        """Create result when no feeds have the indicator"""
        return CorroborationResult(
            indicator_value=indicator_value,
            indicator_type=indicator_type,
            corroboration_score=0.0,
            corroborating_feeds=[],
            feed_count=0,
            weighted_confidence=0.0,
            time_decay_factor=0.0,
            consensus_tags=[],
            first_seen_global=datetime.utcnow(),
            last_seen_global=datetime.utcnow(),
            verdict='benign'
        )


async def example_usage():
    """Example usage of cross-feed corroboration"""

    # Mock feed configuration
    feed_endpoints = {
        'virustotal': 'https://api.virustotal.com/v3',
        'abuseipdb': 'https://api.abuseipdb.com/v2',
        'otx': 'https://otx.alienvault.com/api/v1'
    }

    feed_weights = {
        'virustotal': 0.95,  # Highly reliable
        'abuseipdb': 0.85,   # Reliable
        'otx': 0.75          # Moderately reliable
    }

    # Create service
    service = CrossFeedCorroboration(
        feed_endpoints=feed_endpoints,
        feed_weights=feed_weights,
        time_decay_days=30
    )

    # Corroborate an indicator
    indicator_value = "1.2.3.4"
    indicator_type = "ip"

    result = await service.corroborate(indicator_value, indicator_type)

    print(f"Corroboration Result for {indicator_value}:")
    print(f"  Corroboration Score: {result.corroboration_score:.3f}")
    print(f"  Weighted Confidence: {result.weighted_confidence:.3f}")
    print(f"  Feed Count: {result.feed_count}")
    print(f"  Corroborating Feeds: {', '.join(result.corroborating_feeds)}")
    print(f"  Time Decay Factor: {result.time_decay_factor:.3f}")
    print(f"  Consensus Tags: {', '.join(result.consensus_tags)}")
    print(f"  Verdict: {result.verdict}")


if __name__ == "__main__":
    asyncio.run(example_usage())
