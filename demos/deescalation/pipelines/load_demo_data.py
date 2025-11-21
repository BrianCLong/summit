"""
Pipeline to load curated demo data for De-escalation Coaching demo.

This pipeline implements a robust conversation analysis flow with:
- Comprehensive error handling and recovery
- Structured logging with different severity levels
- Retry logic for API calls with exponential backoff
- Input validation and sanitization
- Graceful degradation when API unavailable
- Progress tracking and observability
- Detailed inline documentation

Flow:
1. Load demo conversations from JSONL with validation
2. Analyze toxicity, sentiment, emotion via API or mock
3. Generate rewrite suggestions
4. Prepare coaching guidance
5. Save results with atomic write operations
6. Emit metrics for monitoring

Author: Summit Platform Team
Version: 2.0.0
Last Updated: 2025-11-20
"""

import json
import sys
import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

# Optional: requests for API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    logger.warning("requests module not available - API mode disabled")
    requests = None
    REQUESTS_AVAILABLE = False


class AnalysisMode(Enum):
    """Analysis execution mode."""
    API = "api"  # Use de-escalation coach API
    MOCK = "mock"  # Use ground truth data (for demos)


class EscalationRisk(Enum):
    """Escalation risk levels."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PipelineMetrics:
    """
    Track pipeline execution metrics for observability.

    Attributes:
        conversations_processed: Successfully analyzed conversations
        conversations_failed: Conversations that failed analysis
        api_calls_made: Number of API calls attempted
        api_calls_failed: Number of failed API calls
        risk_distribution: Count per escalation risk level
        total_processing_time_ms: Cumulative processing time
        avg_toxicity: Average toxicity across all conversations
        errors: List of error details for debugging
    """
    conversations_processed: int = 0
    conversations_failed: int = 0
    api_calls_made: int = 0
    api_calls_failed: int = 0
    risk_distribution: Dict[str, int] = field(default_factory=lambda: {
        "none": 0, "low": 0, "medium": 0, "high": 0, "critical": 0
    })
    total_processing_time_ms: float = 0.0
    avg_toxicity: float = 0.0
    errors: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary for JSON serialization."""
        return {
            "conversations_processed": self.conversations_processed,
            "conversations_failed": self.conversations_failed,
            "api_calls_made": self.api_calls_made,
            "api_calls_failed": self.api_calls_failed,
            "api_success_rate": (
                (self.api_calls_made - self.api_calls_failed) / self.api_calls_made
                if self.api_calls_made > 0 else 0
            ),
            "risk_distribution": self.risk_distribution,
            "total_processing_time_ms": self.total_processing_time_ms,
            "avg_processing_time_ms": (
                self.total_processing_time_ms / self.conversations_processed
                if self.conversations_processed > 0 else 0
            ),
            "avg_toxicity": self.avg_toxicity,
            "error_count": len(self.errors),
            "success_rate": (
                self.conversations_processed /
                (self.conversations_processed + self.conversations_failed)
                if (self.conversations_processed + self.conversations_failed) > 0 else 0
            )
        }


class ValidationError(Exception):
    """Raised when input data fails validation."""
    pass


class AnalysisError(Exception):
    """Raised when analysis fails."""
    pass


class APIError(Exception):
    """Raised when API call fails."""
    pass


class DemoConversationLoader:
    """
    Loads and processes demo conversations for de-escalation coaching.

    This class implements a robust pipeline that:
    - Validates all input data before processing
    - Connects to de-escalation coach API when available
    - Falls back to mock analysis when API unavailable
    - Handles errors gracefully with retries
    - Tracks metrics for observability
    - Generates coaching guidance

    Attributes:
        data_path: Path to dataset directory
        output_path: Path to output directory
        api_url: URL for de-escalation coach API
        mode: Analysis mode (api or mock)
        metrics: Pipeline execution metrics
        max_retries: Maximum retry attempts for API calls
        timeout: API request timeout in seconds
    """

    # Scenario-specific coaching guidance templates
    SCENARIO_GUIDANCE = {
        "billing_dispute": [
            "Review account history before responding",
            "Offer specific timeline for resolution",
            "Consider escalation to billing specialist"
        ],
        "service_outage": [
            "Acknowledge business impact",
            "Provide concrete ETA for restoration",
            "Offer service credits proactively"
        ],
        "subscription_cancellation": [
            "Verify cancellation status immediately",
            "If error occurred, apologize and fix",
            "Document for fraud prevention team"
        ],
        "shipping_delay": [
            "Express empathy for missed special occasion",
            "Expedite shipping at no charge",
            "Offer discount on future order"
        ],
        "refund_processing": [
            "Investigate refund status immediately",
            "Escalate to finance if delayed",
            "Provide proof of processing if available"
        ],
        "product_defect": [
            "Apologize for the inconvenience",
            "Offer replacement or refund options",
            "Document defect for quality team"
        ],
        "account_access": [
            "Verify customer identity securely",
            "Provide clear recovery steps",
            "Escalate to security if suspicious"
        ],
        "technical_support": [
            "Gather diagnostic information",
            "Provide workaround if available",
            "Set clear expectations for fix timeline"
        ],
        "feature_request": [
            "Thank customer for feedback",
            "Log request in product backlog",
            "Set expectations on feature roadmap"
        ],
        "price_increase": [
            "Explain value proposition",
            "Check for available promotions",
            "Offer loyalty discounts if applicable"
        ],
        "data_privacy": [
            "Take concerns seriously",
            "Provide clear privacy documentation",
            "Offer data export/deletion options"
        ],
        "positive_feedback": [
            "Thank customer sincerely",
            "Share feedback with team",
            "Ask for review if appropriate"
        ]
    }

    def __init__(
        self,
        data_path: Path,
        output_path: Path,
        api_url: str = None,
        mode: AnalysisMode = None,
        max_retries: int = 3,
        timeout: int = 10
    ):
        """
        Initialize the demo conversation loader.

        Args:
            data_path: Directory containing demo datasets
            output_path: Directory for output files
            api_url: De-escalation coach API URL (default: localhost:8000)
            mode: Analysis mode (auto-detected if None)
            max_retries: Max retry attempts for API calls
            timeout: API request timeout in seconds

        Raises:
            FileNotFoundError: If data_path doesn't exist
        """
        # Validate paths
        if not data_path.exists():
            raise FileNotFoundError(f"Data path does not exist: {data_path}")

        self.data_path = data_path
        self.output_path = output_path
        self.api_url = api_url or "http://localhost:8000"
        self.max_retries = max_retries
        self.timeout = timeout
        self.metrics = PipelineMetrics()

        # Ensure output directory exists
        self.output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Output directory ready: {self.output_path}")

        # Set up log file handler now that output exists
        log_file = self.output_path / 'pipeline.log'
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        logger.addHandler(file_handler)

        # Auto-detect mode if not specified
        if mode is None:
            self.api_available = self._check_api()
            self.mode = AnalysisMode.API if self.api_available else AnalysisMode.MOCK
        else:
            self.mode = mode
            self.api_available = mode == AnalysisMode.API and self._check_api()

        logger.info(f"Pipeline initialized in {self.mode.value} mode")

    def _check_api(self) -> bool:
        """
        Check if de-escalation coach API is available.

        Performs health check with short timeout.

        Returns:
            True if API responds with 200, False otherwise
        """
        if not REQUESTS_AVAILABLE:
            logger.warning("requests module not available")
            return False

        try:
            response = requests.get(
                f"{self.api_url}/healthz",
                timeout=2
            )
            if response.status_code == 200:
                logger.info(f"API health check passed: {self.api_url}")
                return True
            else:
                logger.warning(f"API health check failed: {response.status_code}")
                return False
        except requests.exceptions.Timeout:
            logger.warning(f"API health check timeout: {self.api_url}")
            return False
        except requests.exceptions.ConnectionError:
            logger.warning(f"API not reachable: {self.api_url}")
            return False
        except Exception as e:
            logger.warning(f"API health check error: {e}")
            return False

    def validate_conversation(
        self,
        conv: Dict[str, Any],
        line_num: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a single conversation's data structure.

        Checks for required fields and data type correctness.

        Args:
            conv: Conversation dictionary to validate
            line_num: Line number in source file (for error reporting)

        Returns:
            Tuple of (is_valid, error_message)
        """
        required_fields = ['id', 'scenario', 'customer_message']

        # Check required fields
        for field_name in required_fields:
            if field_name not in conv:
                return False, f"Line {line_num}: Missing required field '{field_name}'"

        # Validate field types
        if not isinstance(conv['id'], str) or not conv['id']:
            return False, f"Line {line_num}: 'id' must be non-empty string"

        if not isinstance(conv['customer_message'], str):
            return False, f"Line {line_num}: 'customer_message' must be string"

        if not isinstance(conv['scenario'], str) or not conv['scenario']:
            return False, f"Line {line_num}: 'scenario' must be non-empty string"

        # Validate ground_truth if present
        if 'ground_truth' in conv:
            gt = conv['ground_truth']
            if not isinstance(gt, dict):
                return False, f"Line {line_num}: 'ground_truth' must be dict"

            # Check required ground truth fields
            gt_required = ['toxicity', 'escalation_risk']
            for gt_field in gt_required:
                if gt_field not in gt:
                    return False, f"Line {line_num}: ground_truth missing '{gt_field}'"

            # Validate toxicity range
            toxicity = gt.get('toxicity', 0)
            if not isinstance(toxicity, (int, float)) or toxicity < 0 or toxicity > 1:
                return False, f"Line {line_num}: toxicity must be 0-1"

            # Validate escalation risk
            valid_risks = ['none', 'low', 'medium', 'high', 'critical']
            if gt.get('escalation_risk') not in valid_risks:
                return False, f"Line {line_num}: invalid escalation_risk"

        return True, None

    def load_conversations(self) -> List[Dict[str, Any]]:
        """
        Load demo conversations from JSONL file with validation.

        Implements:
        - Line-by-line parsing for memory efficiency
        - Validation of each conversation before adding
        - Graceful handling of malformed lines
        - Detailed error logging

        Returns:
            List of validated conversation dictionaries

        Raises:
            FileNotFoundError: If demo-conversations.jsonl doesn't exist
            ValueError: If no valid conversations found
        """
        conv_file = self.data_path / "demo-conversations.jsonl"

        if not conv_file.exists():
            raise FileNotFoundError(f"Conversations file not found: {conv_file}")

        logger.info(f"Loading conversations from: {conv_file}")

        conversations = []
        errors = []

        with open(conv_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Skip empty lines
                if not line.strip():
                    continue

                try:
                    # Parse JSON
                    conv = json.loads(line)

                    # Validate structure
                    is_valid, error_msg = self.validate_conversation(conv, line_num)

                    if not is_valid:
                        logger.warning(error_msg)
                        errors.append({"line": line_num, "error": error_msg})
                        continue

                    conversations.append(conv)

                except json.JSONDecodeError as e:
                    error_msg = f"Line {line_num}: Invalid JSON - {e}"
                    logger.warning(error_msg)
                    errors.append({"line": line_num, "error": error_msg})
                except Exception as e:
                    error_msg = f"Line {line_num}: Unexpected error - {e}"
                    logger.error(error_msg)
                    errors.append({"line": line_num, "error": error_msg})

        # Require at least one valid conversation
        if not conversations:
            raise ValueError(f"No valid conversations found in {conv_file}. Errors: {errors}")

        # Log summary
        if errors:
            logger.warning(f"Loaded {len(conversations)} conversations with {len(errors)} errors")
        else:
            logger.info(f"✓ Successfully loaded {len(conversations)} demo conversations")
            print(f"✓ Loaded {len(conversations)} demo conversations")

        return conversations

    def analyze_with_api(
        self,
        text: str,
        attempt: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Call de-escalation coach API with retry logic.

        Args:
            text: Customer message text to analyze
            attempt: Current attempt number (1-indexed)

        Returns:
            API response dict or None if failed

        Raises:
            APIError: After max retries exhausted
        """
        if not REQUESTS_AVAILABLE:
            return None

        self.metrics.api_calls_made += 1

        try:
            response = requests.post(
                f"{self.api_url}/analyze",
                json={"text": text},
                timeout=self.timeout
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise APIError(f"API returned {response.status_code}")

        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            # Transient error - retry
            if attempt >= self.max_retries:
                self.metrics.api_calls_failed += 1
                logger.error(f"API call failed after {self.max_retries} attempts: {e}")
                return None

            # Exponential backoff
            delay = 2 ** attempt
            logger.warning(f"API call attempt {attempt} failed. Retrying in {delay}s...")
            time.sleep(delay)

            return self.analyze_with_api(text, attempt + 1)

        except Exception as e:
            self.metrics.api_calls_failed += 1
            logger.error(f"API call error: {e}")
            return None

    def analyze_conversation(self, conv: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single conversation for tone and provide coaching.

        Performs multi-dimensional analysis:
        1. Toxicity scoring
        2. Sentiment classification
        3. Emotion detection
        4. Absolutism analysis
        5. Rewrite generation
        6. Coaching guidance

        Args:
            conv: Conversation dictionary with customer_message

        Returns:
            Enriched conversation with analysis results

        Raises:
            AnalysisError: If analysis completely fails
        """
        start_time = time.time()

        # Initialize result structure
        result = {
            "conversation": conv,
            "analysis": {
                "timestamp": datetime.utcnow().isoformat(),
                "mode": self.mode.value,
                "diagnostic": {},
                "rewrite": {},
                "guidance": [],
                "escalation_risk": conv.get("ground_truth", {}).get("escalation_risk", "unknown"),
                "processing_time_ms": 0.0
            }
        }

        try:
            # Try API if available
            if self.mode == AnalysisMode.API and self.api_available:
                logger.debug(f"Using API for {conv['id']}")
                api_result = self.analyze_with_api(conv["customer_message"])

                if api_result:
                    result["analysis"]["diagnostic"] = api_result.get("diagnostic", {})
                    result["analysis"]["rewrite"] = api_result.get("rewrite", {})
                    result["analysis"]["guidance"] = api_result.get("guidance", [])
                    result["analysis"]["policy_flags"] = api_result.get("policy_flags", [])
                else:
                    # API failed - fall back to mock
                    logger.warning(f"API failed for {conv['id']}, using mock")
                    mock_result = self._mock_analysis(conv)
                    result["analysis"].update(mock_result)
            else:
                # Mock mode
                logger.debug(f"Using mock analysis for {conv['id']}")
                mock_result = self._mock_analysis(conv)
                result["analysis"].update(mock_result)

            # Record processing time
            processing_time_ms = (time.time() - start_time) * 1000
            result["analysis"]["processing_time_ms"] = processing_time_ms

            logger.debug(
                f"Completed analysis for {conv['id']} in {processing_time_ms:.2f}ms "
                f"(toxicity={result['analysis']['diagnostic'].get('toxicity', 'N/A')})"
            )

            return result

        except Exception as e:
            logger.error(f"Analysis failed for {conv['id']}: {e}", exc_info=True)
            raise AnalysisError(f"Analysis failed: {e}")

    def _mock_analysis(self, conv: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock analysis based on ground truth data.

        Used when API is unavailable. Provides consistent
        demo behavior by using curated ground truth values.

        Args:
            conv: Conversation with ground_truth

        Returns:
            Analysis dict matching API response schema
        """
        gt = conv.get("ground_truth", {})

        # Build diagnostic from ground truth
        diagnostic = {
            "toxicity": gt.get("toxicity", 0.5),
            "sentiment": gt.get("sentiment", "neutral"),
            "emotion": gt.get("emotion", "neutral"),
            "absolutist_score": gt.get("absolutist_score", 0.0),
            "caps_ratio": self._calculate_caps_ratio(conv["customer_message"])
        }

        # Generate rewrite
        rewrite = self._generate_rewrite(conv["customer_message"], diagnostic)

        # Generate coaching guidance
        guidance = self._generate_guidance(
            conv["scenario"],
            diagnostic,
            gt.get("recommended_approach", "")
        )

        return {
            "diagnostic": diagnostic,
            "rewrite": {
                "version": "v1",
                "text": rewrite
            },
            "guidance": guidance,
            "policy_flags": [],
            "escalation_risk": gt.get("escalation_risk", "unknown")
        }

    def _calculate_caps_ratio(self, text: str) -> float:
        """
        Calculate ratio of uppercase characters in text.

        High caps ratio indicates shouting/aggression.

        Args:
            text: Text to analyze

        Returns:
            Ratio from 0.0 (no caps) to 1.0 (all caps)
        """
        if not text:
            return 0.0

        letters = [c for c in text if c.isalpha()]
        if not letters:
            return 0.0

        caps = [c for c in letters if c.isupper()]
        return len(caps) / len(letters)

    def _generate_rewrite(
        self,
        text: str,
        diagnostic: Dict[str, Any]
    ) -> str:
        """
        Generate a de-escalated version of the customer message.

        Applies transformations:
        - Lowercase shouting
        - Reduce punctuation emphasis
        - Soften absolutist language
        - Neutralize accusations

        Args:
            text: Original message
            diagnostic: Analysis results (used for context)

        Returns:
            De-escalated version of message
        """
        if not text:
            return ""

        rewrite = text.lower()

        # Remove excessive punctuation
        replacements = [
            ("!!!", "."),
            ("!!", "."),
            ("!", "."),
            ("???", "?"),
            ("??", "?"),
        ]
        for old, new in replacements:
            rewrite = rewrite.replace(old, new)

        # Soften absolutist language
        softeners = [
            ("never", "haven't yet"),
            ("always", "often"),
            ("every time", "frequently"),
            ("nothing works", "I'm having difficulties"),
            ("completely ruined", "significantly impacted"),
        ]
        for old, new in softeners:
            rewrite = rewrite.replace(old, new)

        # Neutralize common accusations
        neutralizers = [
            ("you're stealing", "there's been a billing issue"),
            ("you're crooks", "I'm frustrated with the service"),
            ("you people are crooks", "I'm frustrated with this situation"),
            ("incompetent", "I'm having technical difficulties"),
            ("this is fraud", "this appears to be an error"),
            ("scam operation", "service issue"),
        ]
        for old, new in neutralizers:
            rewrite = rewrite.replace(old, new)

        # Capitalize sentences properly
        sentences = rewrite.split(". ")
        rewrite = ". ".join(s.capitalize() if s else s for s in sentences)

        return rewrite

    def _generate_guidance(
        self,
        scenario: str,
        diagnostic: Dict[str, Any],
        approach: str
    ) -> List[str]:
        """
        Generate coaching guidance for the customer service agent.

        Combines:
        - Risk-based general guidance
        - Scenario-specific recommendations
        - Tone-aware warnings

        Args:
            scenario: Conversation scenario type
            diagnostic: Analysis results
            approach: Recommended approach from ground truth

        Returns:
            List of coaching guidance strings
        """
        guidance = []

        # === Risk-based guidance ===
        toxicity = diagnostic.get("toxicity", 0)

        if toxicity > 0.8:
            guidance.append("🚨 CRITICAL: Very high toxicity. Consider supervisor involvement.")
            guidance.append("Remain calm. Do not match customer's tone.")
        elif toxicity > 0.7:
            guidance.append("⚠️ High toxicity detected. Remain calm and professional.")
            guidance.append("Acknowledge the customer's frustration explicitly.")
        elif toxicity > 0.4:
            guidance.append("Moderate frustration detected. Show empathy and understanding.")
        elif toxicity < 0.1:
            guidance.append("✓ Positive interaction. Maintain friendly, helpful tone.")

        # === Scenario-specific guidance ===
        if scenario in self.SCENARIO_GUIDANCE:
            guidance.extend(self.SCENARIO_GUIDANCE[scenario])

        # === Tone-aware warnings ===
        absolutist_score = diagnostic.get("absolutist_score", 0)
        if absolutist_score > 0.6:
            guidance.append("⚠️ Customer using absolutist language - avoid matching tone.")

        caps_ratio = diagnostic.get("caps_ratio", 0)
        if caps_ratio > 0.3:
            guidance.append("Customer is shouting (high caps usage) - respond calmly.")

        return guidance

    def process_all(self) -> Dict[str, Any]:
        """
        Process all demo conversations and save results.

        Main pipeline execution:
        1. Load and validate conversations
        2. Analyze each with error handling
        3. Track metrics for observability
        4. Save results atomically
        5. Return summary with metrics

        Returns:
            Summary dictionary with results and metrics

        Raises:
            Exception: Critical errors that prevent pipeline completion
        """
        logger.info("=" * 70)
        logger.info("Starting De-escalation Coaching Demo Pipeline")
        logger.info(f"Mode: {self.mode.value}")
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"API Available: {self.api_available}")
        logger.info("=" * 70)

        print("\n🗣️  Starting De-escalation Coaching Demo Pipeline")
        print("=" * 60)

        if self.api_available:
            print("✓ De-escalation Coach API is available")
        else:
            print("⚠️  Using mock analysis (API not available)")

        pipeline_start = time.time()

        # === LOAD CONVERSATIONS ===
        try:
            conversations = self.load_conversations()
        except Exception as e:
            logger.error(f"Failed to load conversations: {e}")
            raise

        results = []
        toxicity_sum = 0.0

        # === PROCESS EACH CONVERSATION ===
        for i, conv in enumerate(conversations, 1):
            conv_id = conv.get('id', f'unknown_{i}')
            print(f"\nAnalyzing conversation {i}/{len(conversations)}: {conv_id}")
            logger.info(f"Processing conversation {i}/{len(conversations)}: {conv_id}")

            try:
                # Analyze conversation
                result = self.analyze_conversation(conv)
                results.append(result)

                # Update metrics
                self.metrics.conversations_processed += 1
                self.metrics.total_processing_time_ms += result["analysis"]["processing_time_ms"]

                # Track risk distribution
                risk = result["analysis"]["escalation_risk"]
                if risk in self.metrics.risk_distribution:
                    self.metrics.risk_distribution[risk] += 1

                # Track toxicity for average
                toxicity = result["analysis"]["diagnostic"].get("toxicity", 0)
                toxicity_sum += toxicity

                # Log results
                print(f"  Scenario: {conv['scenario']}")
                print(f"  Toxicity: {toxicity:.2f} | Risk: {risk}")
                logger.info(f"Conv {conv_id}: toxicity={toxicity:.2f}, risk={risk}")

            except AnalysisError as e:
                # Analysis failed
                self.metrics.conversations_failed += 1
                self.metrics.errors.append({
                    "conversation_id": conv_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                logger.error(f"Failed to analyze conversation {conv_id}: {e}")
                print(f"  ✗ Analysis failed: {e}")

                # Add failed result placeholder
                results.append({
                    "conversation": conv,
                    "analysis": {
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })

        # Calculate average toxicity
        if self.metrics.conversations_processed > 0:
            self.metrics.avg_toxicity = toxicity_sum / self.metrics.conversations_processed

        # === SAVE RESULTS ===
        output_file = self.output_path / "analysis_results.json"
        temp_file = self.output_path / "analysis_results.json.tmp"

        summary = {
            "demo_name": "De-escalation Coaching",
            "processed_at": datetime.utcnow().isoformat(),
            "pipeline_version": "2.0.0",
            "mode": self.mode.value,
            "api_url": self.api_url,
            "total_conversations": len(conversations),
            "risk_distribution": self.metrics.risk_distribution,
            "avg_toxicity": self.metrics.avg_toxicity,
            "results": results,
            "metrics": self.metrics.to_dict(),
            "pipeline_duration_seconds": time.time() - pipeline_start
        }

        try:
            # Atomic write: write to temp file first, then rename
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)

            # Atomic rename
            temp_file.replace(output_file)
            logger.info(f"Results saved successfully to {output_file}")

        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            raise

        # === PRINT SUMMARY ===
        print(f"\n{'=' * 60}")
        print(f"✓ Analysis complete!")
        print(f"  Total conversations: {len(conversations)}")
        print(f"  Successfully processed: {self.metrics.conversations_processed}")
        print(f"  Failed: {self.metrics.conversations_failed}")
        print(f"  Risk distribution:")
        for risk, count in self.metrics.risk_distribution.items():
            if count > 0:
                print(f"    {risk}: {count}")
        print(f"  Average toxicity: {self.metrics.avg_toxicity:.2f}")
        print(f"  Total time: {summary['pipeline_duration_seconds']:.2f}s")
        print(f"\n📊 Results saved to: {output_file}")

        logger.info("=" * 70)
        logger.info("Pipeline completed successfully")
        logger.info(f"Metrics: {self.metrics.to_dict()}")
        logger.info("=" * 70)

        return summary


def main():
    """
    Main entry point for demo data loading.

    Sets up paths and executes pipeline with error handling.
    """
    try:
        base_path = Path(__file__).parent.parent
        data_path = base_path / "datasets"
        output_path = base_path / "output"

        logger.info("Initializing demo conversation loader")
        loader = DemoConversationLoader(data_path, output_path)

        logger.info("Starting pipeline execution")
        summary = loader.process_all()

        # Exit with success
        sys.exit(0)

    except KeyboardInterrupt:
        logger.warning("Pipeline interrupted by user")
        print("\n⚠️  Pipeline interrupted")
        sys.exit(130)

    except Exception as e:
        logger.error(f"Pipeline failed with error: {e}", exc_info=True)
        print(f"\n✗ Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
