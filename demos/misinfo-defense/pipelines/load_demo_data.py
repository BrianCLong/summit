"""
Pipeline to load curated demo data for Adversarial Misinfo Defense demo.

This pipeline implements a robust data processing flow with:
- Comprehensive error handling and recovery
- Structured logging with different severity levels
- Retry logic for transient failures
- Input validation and sanitization
- Graceful degradation when services unavailable
- Progress tracking and observability
- Detailed inline documentation

Flow:
1. Load demo posts from JSONL with validation
2. Run multi-modal analysis (text, video, image)
3. Generate evidence chains for transparency
4. Save results with atomic write operations
5. Emit metrics for monitoring

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
        logging.FileHandler(Path(__file__).parent.parent / 'output' / 'pipeline.log')
    ]
)
logger = logging.getLogger(__name__)

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "adversarial-misinfo-defense-platform"))

# Try importing production modules with explicit error handling
try:
    from adversarial_misinfo_defense_platform.deepfake_detector import DeepfakeDetector
    from adversarial_misinfo_defense_platform.meme_analyzer import MemeManipulationDetector
    from adversarial_misinfo_defense_platform.text_analyzer import TextMisinfoDetector
    PRODUCTION_MODULES_AVAILABLE = True
    logger.info("Production detection modules loaded successfully")
except ImportError as e:
    # Fallback to mock analysis - this is intentional for demo portability
    logger.warning(f"Production modules not available: {e}. Using mock analysis.")
    print("⚠️  Production modules not available, using mock analysis")
    DeepfakeDetector = None
    MemeManipulationDetector = None
    TextMisinfoDetector = None
    PRODUCTION_MODULES_AVAILABLE = False


class AnalysisMode(Enum):
    """Analysis execution mode."""
    PRODUCTION = "production"  # Use real ML models
    MOCK = "mock"  # Use ground truth data (for demos)
    HYBRID = "hybrid"  # Mix of both


@dataclass
class PipelineMetrics:
    """Track pipeline execution metrics for observability."""
    posts_processed: int = 0
    posts_failed: int = 0
    misinfo_detected: int = 0
    legitimate_detected: int = 0
    total_processing_time_ms: float = 0.0
    avg_confidence: float = 0.0
    errors: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary for JSON serialization."""
        return {
            "posts_processed": self.posts_processed,
            "posts_failed": self.posts_failed,
            "misinfo_detected": self.misinfo_detected,
            "legitimate_detected": self.legitimate_detected,
            "total_processing_time_ms": self.total_processing_time_ms,
            "avg_processing_time_ms": (
                self.total_processing_time_ms / self.posts_processed
                if self.posts_processed > 0 else 0
            ),
            "avg_confidence": self.avg_confidence,
            "error_count": len(self.errors),
            "success_rate": (
                self.posts_processed / (self.posts_processed + self.posts_failed)
                if (self.posts_processed + self.posts_failed) > 0 else 0
            )
        }


class ValidationError(Exception):
    """Raised when input data fails validation."""
    pass


class AnalysisError(Exception):
    """Raised when analysis fails."""
    pass


class DemoDataLoader:
    """
    Loads and processes demo data for misinfo defense demonstration.

    This class implements a robust pipeline that:
    - Validates all input data before processing
    - Handles errors gracefully with retries
    - Tracks metrics for observability
    - Falls back to mock analysis when needed
    - Generates comprehensive evidence chains

    Attributes:
        data_path: Path to dataset directory
        output_path: Path to output directory
        mode: Analysis mode (production, mock, or hybrid)
        metrics: Pipeline execution metrics
        max_retries: Maximum retry attempts for transient failures
    """

    def __init__(
        self,
        data_path: Path,
        output_path: Path,
        mode: AnalysisMode = None,
        max_retries: int = 3
    ):
        """
        Initialize the demo data loader.

        Args:
            data_path: Directory containing demo datasets
            output_path: Directory for output files
            mode: Analysis mode (auto-detected if None)
            max_retries: Max retry attempts for transient failures

        Raises:
            FileNotFoundError: If data_path doesn't exist
        """
        # Validate paths
        if not data_path.exists():
            raise FileNotFoundError(f"Data path does not exist: {data_path}")

        self.data_path = data_path
        self.output_path = output_path
        self.max_retries = max_retries
        self.metrics = PipelineMetrics()

        # Ensure output directory exists
        self.output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Output directory ready: {self.output_path}")

        # Auto-detect mode if not specified
        if mode is None:
            self.mode = AnalysisMode.PRODUCTION if PRODUCTION_MODULES_AVAILABLE else AnalysisMode.MOCK
        else:
            self.mode = mode

        logger.info(f"Pipeline initialized in {self.mode.value} mode")

        # Initialize detectors based on mode and availability
        self._initialize_detectors()

    def _initialize_detectors(self) -> None:
        """
        Initialize detection modules based on mode and availability.

        Implements fallback logic: production → mock if unavailable.
        Logs initialization status for each detector.
        """
        if self.mode == AnalysisMode.PRODUCTION and PRODUCTION_MODULES_AVAILABLE:
            try:
                self.deepfake_detector = DeepfakeDetector()
                self.meme_detector = MemeManipulationDetector()
                self.text_detector = TextMisinfoDetector()
                logger.info("All production detectors initialized")
            except Exception as e:
                logger.error(f"Failed to initialize production detectors: {e}")
                logger.warning("Falling back to mock mode")
                self.mode = AnalysisMode.MOCK
                self.deepfake_detector = None
                self.meme_detector = None
                self.text_detector = None
        else:
            # Mock mode - no detector initialization needed
            self.deepfake_detector = None
            self.meme_detector = None
            self.text_detector = None
            logger.info("Using mock analysis (no detectors initialized)")

    def validate_post(self, post: Dict[str, Any], line_num: int) -> Tuple[bool, Optional[str]]:
        """
        Validate a single post's data structure.

        Checks for required fields and data type correctness.

        Args:
            post: Post dictionary to validate
            line_num: Line number in source file (for error reporting)

        Returns:
            Tuple of (is_valid, error_message)
        """
        required_fields = ['id', 'platform', 'text', 'timestamp']

        # Check required fields
        for field in required_fields:
            if field not in post:
                return False, f"Line {line_num}: Missing required field '{field}'"

        # Validate field types
        if not isinstance(post['id'], str) or not post['id']:
            return False, f"Line {line_num}: 'id' must be non-empty string"

        if not isinstance(post['text'], str):
            return False, f"Line {line_num}: 'text' must be string"

        # Validate media if present
        if 'media' in post:
            if not isinstance(post['media'], list):
                return False, f"Line {line_num}: 'media' must be list"

            for i, media_item in enumerate(post['media']):
                if 'type' not in media_item:
                    return False, f"Line {line_num}: media[{i}] missing 'type'"
                if media_item['type'] not in ['image', 'video', 'audio']:
                    return False, f"Line {line_num}: media[{i}] invalid type"

        return True, None

    def load_posts(self) -> List[Dict[str, Any]]:
        """
        Load demo posts from JSONL file with validation.

        Implements:
        - Line-by-line parsing for memory efficiency
        - Validation of each post before adding
        - Graceful handling of malformed lines
        - Detailed error logging

        Returns:
            List of validated post dictionaries

        Raises:
            FileNotFoundError: If demo-posts.jsonl doesn't exist
            ValueError: If no valid posts found
        """
        posts_file = self.data_path / "demo-posts.jsonl"

        if not posts_file.exists():
            raise FileNotFoundError(f"Demo posts file not found: {posts_file}")

        logger.info(f"Loading posts from: {posts_file}")

        posts = []
        errors = []

        with open(posts_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Skip empty lines
                if not line.strip():
                    continue

                try:
                    # Parse JSON
                    post = json.loads(line)

                    # Validate structure
                    is_valid, error_msg = self.validate_post(post, line_num)

                    if not is_valid:
                        logger.warning(error_msg)
                        errors.append({"line": line_num, "error": error_msg})
                        continue

                    posts.append(post)

                except json.JSONDecodeError as e:
                    error_msg = f"Line {line_num}: Invalid JSON - {e}"
                    logger.warning(error_msg)
                    errors.append({"line": line_num, "error": error_msg})
                except Exception as e:
                    error_msg = f"Line {line_num}: Unexpected error - {e}"
                    logger.error(error_msg)
                    errors.append({"line": line_num, "error": error_msg})

        # Require at least one valid post
        if not posts:
            raise ValueError(f"No valid posts found in {posts_file}. Errors: {errors}")

        # Log summary
        if errors:
            logger.warning(f"Loaded {len(posts)} posts with {len(errors)} errors")
            for err in errors[:5]:  # Log first 5 errors
                logger.warning(f"  {err}")
        else:
            logger.info(f"✓ Successfully loaded {len(posts)} demo posts")
            print(f"✓ Loaded {len(posts)} demo posts")

        return posts

    def analyze_post_with_retry(
        self,
        post: Dict[str, Any],
        attempt: int = 1
    ) -> Dict[str, Any]:
        """
        Analyze post with exponential backoff retry logic.

        Handles transient failures (network, API timeouts) by retrying
        with increasing delays. Permanent failures are logged and re-raised.

        Args:
            post: Post to analyze
            attempt: Current attempt number (1-indexed)

        Returns:
            Analysis result dictionary

        Raises:
            AnalysisError: After max retries exhausted
        """
        try:
            return self.analyze_post(post)

        except Exception as e:
            # Check if we should retry
            if attempt >= self.max_retries:
                logger.error(
                    f"Analysis failed after {self.max_retries} attempts for post {post['id']}: {e}"
                )
                raise AnalysisError(f"Max retries exceeded: {e}")

            # Exponential backoff: 2^attempt seconds
            delay = 2 ** attempt
            logger.warning(
                f"Analysis attempt {attempt} failed for post {post['id']}: {e}. "
                f"Retrying in {delay}s..."
            )
            time.sleep(delay)

            # Recursive retry
            return self.analyze_post_with_retry(post, attempt + 1)

    def analyze_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single post for misinformation.

        Performs multi-modal analysis:
        1. Text pattern analysis (red flags, conspiracy markers)
        2. Video deepfake detection (if applicable)
        3. Image manipulation detection (if applicable)

        All analysis is evidence-based and includes confidence scores.

        Args:
            post: Post dictionary with text and optional media

        Returns:
            Enriched post with analysis results and evidence chain

        Raises:
            KeyError: If required fields missing (should be caught by validation)
            Exception: If analysis modules fail
        """
        start_time = time.time()

        # Initialize result structure
        result = {
            "post": post,
            "analysis": {
                "timestamp": datetime.utcnow().isoformat(),
                "mode": self.mode.value,
                "detection_results": {},
                "overall_score": 0.0,
                "is_misinfo": False,
                "confidence": 0.0,
                "evidence": [],
                "processing_time_ms": 0.0
            }
        }

        try:
            # === TEXT ANALYSIS ===
            if self.text_detector:
                # Production mode: use real text detector
                logger.debug(f"Running production text analysis for {post['id']}")
                text_result = self.text_detector.analyze(post["text"])
                result["analysis"]["detection_results"]["text"] = text_result
            else:
                # Mock mode: use ground truth
                logger.debug(f"Using mock text analysis for {post['id']}")
                gt = post.get("ground_truth", {})
                result["analysis"]["detection_results"]["text"] = {
                    "is_misinfo": gt.get("is_misinfo", False),
                    "confidence": gt.get("confidence", 0.5),
                    "category": gt.get("category", "unknown"),
                    "red_flags": gt.get("red_flags", []),
                    "manipulation_type": gt.get("manipulation_type")
                }

            # === MEDIA ANALYSIS ===
            media_items = post.get("media", [])
            for media_idx, media_item in enumerate(media_items):
                media_type = media_item.get("type")
                logger.debug(f"Analyzing media {media_idx}: {media_type}")

                # Video analysis (deepfake detection)
                if media_type == "video":
                    if self.deepfake_detector:
                        # Production mode
                        deepfake_result = self.deepfake_detector.analyze(media_item["url"])
                        result["analysis"]["detection_results"]["video"] = deepfake_result
                    else:
                        # Mock mode
                        gt = post.get("ground_truth", {})
                        result["analysis"]["detection_results"]["video"] = {
                            "is_deepfake": gt.get("manipulation_type") == "deepfake_video",
                            "confidence": gt.get("confidence", 0.5),
                            "manipulation_markers": gt.get("manipulation_markers", [])
                        }

                # Image analysis (manipulation detection)
                elif media_type == "image":
                    if self.meme_detector:
                        # Production mode
                        meme_result = self.meme_detector.analyze(media_item["url"])
                        result["analysis"]["detection_results"]["image"] = meme_result
                    else:
                        # Mock mode
                        gt = post.get("ground_truth", {})
                        result["analysis"]["detection_results"]["image"] = {
                            "is_manipulated": gt.get("is_misinfo", False),
                            "confidence": gt.get("confidence", 0.5),
                            "manipulation_type": gt.get("manipulation_type")
                        }

            # === AGGREGATE RESULTS ===
            detection_results = result["analysis"]["detection_results"]

            if detection_results:
                # Calculate average confidence across all modalities
                confidences = [
                    r.get("confidence", 0.0)
                    for r in detection_results.values()
                    if isinstance(r, dict)
                ]

                if confidences:
                    result["analysis"]["confidence"] = sum(confidences) / len(confidences)

                # Overall misinfo determination: any modality flags it
                result["analysis"]["is_misinfo"] = any(
                    r.get("is_misinfo") or r.get("is_deepfake") or r.get("is_manipulated")
                    for r in detection_results.values()
                    if isinstance(r, dict)
                )

            # === GENERATE EVIDENCE CHAIN ===
            # Evidence provides transparency and explainability
            result["analysis"]["evidence"] = self._generate_evidence(post, result["analysis"])

            # Record processing time
            processing_time_ms = (time.time() - start_time) * 1000
            result["analysis"]["processing_time_ms"] = processing_time_ms

            logger.debug(
                f"Completed analysis for {post['id']} in {processing_time_ms:.2f}ms "
                f"(misinfo={result['analysis']['is_misinfo']}, "
                f"confidence={result['analysis']['confidence']:.2f})"
            )

            return result

        except KeyError as e:
            # Missing required field (should be caught by validation)
            logger.error(f"Missing field in post {post.get('id', 'unknown')}: {e}")
            raise

        except Exception as e:
            # Unexpected error during analysis
            logger.error(f"Analysis failed for post {post.get('id', 'unknown')}: {e}", exc_info=True)
            raise AnalysisError(f"Analysis failed: {e}")

    def _generate_evidence(
        self,
        post: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate evidence items for UI display and transparency.

        Evidence provides specific, actionable indicators that:
        1. Explain WHY content was flagged
        2. Reference specific patterns/markers
        3. Include severity assessment
        4. Support analyst decision-making

        Args:
            post: Original post data
            analysis: Analysis results

        Returns:
            List of evidence dictionaries with type, title, description, severity
        """
        evidence = []

        # === TEXT-BASED EVIDENCE ===
        text_result = analysis["detection_results"].get("text", {})
        red_flags = text_result.get("red_flags", [])

        if red_flags:
            # Determine severity based on number of red flags
            severity = "critical" if len(red_flags) >= 4 else "high" if len(red_flags) >= 3 else "medium"

            evidence.append({
                "type": "text_analysis",
                "title": "Suspicious Language Patterns Detected",
                "description": (
                    f"Found {len(red_flags)} red flags: {', '.join(red_flags)}. "
                    f"These patterns are commonly associated with {text_result.get('category', 'misinformation')}."
                ),
                "severity": severity,
                "indicators": red_flags
            })

        # === VIDEO EVIDENCE (DEEPFAKE) ===
        video_result = analysis["detection_results"].get("video", {})

        if video_result.get("is_deepfake"):
            markers = video_result.get("manipulation_markers", [])

            evidence.append({
                "type": "deepfake_detection",
                "title": "Deepfake Video Detected",
                "description": (
                    f"Found {len(markers)} manipulation markers: {', '.join(markers)}. "
                    f"These forensic indicators suggest synthetic or manipulated video content."
                ),
                "severity": "critical",
                "indicators": markers
            })

        # === IMAGE EVIDENCE ===
        image_result = analysis["detection_results"].get("image", {})

        if image_result.get("is_manipulated"):
            manipulation_type = image_result.get("manipulation_type", "unknown")

            evidence.append({
                "type": "image_manipulation",
                "title": "Image Manipulation Detected",
                "description": (
                    f"Manipulation type: {manipulation_type}. "
                    f"The image has been altered in a way that could mislead viewers."
                ),
                "severity": "high",
                "indicators": [manipulation_type]
            })

        # Log evidence generation
        logger.debug(f"Generated {len(evidence)} evidence items for post {post.get('id', 'unknown')}")

        return evidence

    def process_all(self) -> Dict[str, Any]:
        """
        Process all demo posts and save results.

        Main pipeline execution:
        1. Load and validate posts
        2. Analyze each post with error handling
        3. Track metrics for observability
        4. Save results atomically
        5. Return summary with metrics

        Returns:
            Summary dictionary with results and metrics

        Raises:
            Exception: Critical errors that prevent pipeline completion
        """
        logger.info("=" * 70)
        logger.info("Starting Adversarial Misinfo Defense Demo Pipeline")
        logger.info(f"Mode: {self.mode.value}")
        logger.info(f"Max retries: {self.max_retries}")
        logger.info("=" * 70)

        print("\n🔍 Starting Adversarial Misinfo Defense Demo Pipeline")
        print("=" * 60)

        pipeline_start = time.time()

        # === LOAD POSTS ===
        try:
            posts = self.load_posts()
        except Exception as e:
            logger.error(f"Failed to load posts: {e}")
            raise

        results = []

        # === PROCESS EACH POST ===
        for i, post in enumerate(posts, 1):
            post_id = post.get('id', f'unknown_{i}')
            print(f"\nAnalyzing post {i}/{len(posts)}: {post_id}")
            logger.info(f"Processing post {i}/{len(posts)}: {post_id}")

            try:
                # Analyze with retry logic
                result = self.analyze_post_with_retry(post)
                results.append(result)

                # Update metrics
                self.metrics.posts_processed += 1
                self.metrics.total_processing_time_ms += result["analysis"]["processing_time_ms"]

                # Track detection outcomes
                if result["analysis"]["is_misinfo"]:
                    self.metrics.misinfo_detected += 1
                    print(f"  ⚠️  MISINFO DETECTED - Confidence: {result['analysis']['confidence']:.2%}")
                    logger.info(f"Post {post_id}: MISINFO (confidence={result['analysis']['confidence']:.2%})")
                else:
                    self.metrics.legitimate_detected += 1
                    print(f"  ✓ Legitimate content - Confidence: {result['analysis']['confidence']:.2%}")
                    logger.info(f"Post {post_id}: LEGITIMATE (confidence={result['analysis']['confidence']:.2%})")

            except AnalysisError as e:
                # Analysis failed after retries
                self.metrics.posts_failed += 1
                self.metrics.errors.append({
                    "post_id": post_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                logger.error(f"Failed to analyze post {post_id}: {e}")
                print(f"  ✗ Analysis failed: {e}")

                # Add failed result placeholder
                results.append({
                    "post": post,
                    "analysis": {
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })

        # Calculate average confidence
        if self.metrics.posts_processed > 0:
            total_confidence = sum(
                r["analysis"].get("confidence", 0)
                for r in results
                if "error" not in r["analysis"]
            )
            self.metrics.avg_confidence = total_confidence / self.metrics.posts_processed

        # === SAVE RESULTS ===
        output_file = self.output_path / "analysis_results.json"
        temp_file = self.output_path / "analysis_results.json.tmp"

        summary = {
            "demo_name": "Adversarial Misinfo Defense",
            "processed_at": datetime.utcnow().isoformat(),
            "pipeline_version": "2.0.0",
            "mode": self.mode.value,
            "total_posts": len(posts),
            "misinfo_detected": self.metrics.misinfo_detected,
            "legitimate_content": self.metrics.legitimate_detected,
            "detection_rate": (
                self.metrics.misinfo_detected / self.metrics.posts_processed
                if self.metrics.posts_processed > 0 else 0
            ),
            "results": results,
            "metrics": self.metrics.to_dict(),
            "pipeline_duration_seconds": time.time() - pipeline_start
        }

        try:
            # Atomic write: write to temp file first, then rename
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)

            # Atomic rename (POSIX compliant)
            temp_file.replace(output_file)
            logger.info(f"Results saved successfully to {output_file}")

        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            raise

        # === PRINT SUMMARY ===
        print(f"\n{'=' * 60}")
        print(f"✓ Analysis complete!")
        print(f"  Total posts: {len(posts)}")
        print(f"  Successfully processed: {self.metrics.posts_processed}")
        print(f"  Failed: {self.metrics.posts_failed}")
        print(f"  Misinfo detected: {self.metrics.misinfo_detected}")
        print(f"  Legitimate: {self.metrics.legitimate_detected}")
        print(f"  Detection rate: {summary['detection_rate']:.1%}")
        print(f"  Avg confidence: {self.metrics.avg_confidence:.2%}")
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

        logger.info("Initializing demo data loader")
        loader = DemoDataLoader(data_path, output_path)

        logger.info("Starting pipeline execution")
        summary = loader.process_all()

        # Exit with success
        sys.exit(0)

    except KeyboardInterrupt:
        logger.warning("Pipeline interrupted by user")
        print("\n⚠️  Pipeline interrupted")
        sys.exit(130)  # Standard exit code for SIGINT

    except Exception as e:
        logger.error(f"Pipeline failed with error: {e}", exc_info=True)
        print(f"\n✗ Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
