"""
Pipeline to load curated demo data for Adversarial Misinfo Defense demo.

This script:
1. Loads demo posts from JSONL
2. Runs multi-modal analysis
3. Stores results for UI visualization
4. Prepares copilot context
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "adversarial-misinfo-defense-platform"))

try:
    from adversarial_misinfo_defense_platform.deepfake_detector import DeepfakeDetector
    from adversarial_misinfo_defense_platform.meme_analyzer import MemeManipulationDetector
    from adversarial_misinfo_defense_platform.text_analyzer import TextMisinfoDetector
except ImportError:
    # Fallback if modules not available - use mock detection
    print("⚠️  Production modules not available, using mock analysis")
    DeepfakeDetector = None
    MemeManipulationDetector = None
    TextMisinfoDetector = None


class DemoDataLoader:
    """Loads and processes demo data for misinfo defense demonstration."""

    def __init__(self, data_path: Path, output_path: Path):
        self.data_path = data_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)

        # Initialize detectors if available
        self.deepfake_detector = DeepfakeDetector() if DeepfakeDetector else None
        self.meme_detector = MemeManipulationDetector() if MemeManipulationDetector else None
        self.text_detector = TextMisinfoDetector() if TextMisinfoDetector else None

    def load_posts(self) -> List[Dict[str, Any]]:
        """Load demo posts from JSONL file."""
        posts = []
        with open(self.data_path / "demo-posts.jsonl", "r") as f:
            for line in f:
                if line.strip():
                    posts.append(json.loads(line))
        print(f"✓ Loaded {len(posts)} demo posts")
        return posts

    def analyze_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single post for misinformation.

        Returns enriched post with detection results.
        """
        result = {
            "post": post,
            "analysis": {
                "timestamp": datetime.utcnow().isoformat(),
                "detection_results": {},
                "overall_score": 0.0,
                "is_misinfo": False,
                "confidence": 0.0,
                "evidence": []
            }
        }

        # Text analysis
        if self.text_detector:
            text_result = self.text_detector.analyze(post["text"])
            result["analysis"]["detection_results"]["text"] = text_result
        else:
            # Mock analysis based on ground truth
            gt = post.get("ground_truth", {})
            result["analysis"]["detection_results"]["text"] = {
                "is_misinfo": gt.get("is_misinfo", False),
                "confidence": gt.get("confidence", 0.5),
                "category": gt.get("category", "unknown"),
                "red_flags": gt.get("red_flags", []),
                "manipulation_type": gt.get("manipulation_type")
            }

        # Media analysis (if present)
        if post.get("media"):
            for media_item in post["media"]:
                media_type = media_item["type"]

                if media_type == "video" and self.deepfake_detector:
                    deepfake_result = self.deepfake_detector.analyze(media_item["url"])
                    result["analysis"]["detection_results"]["video"] = deepfake_result
                elif media_type == "video":
                    # Mock deepfake detection
                    gt = post.get("ground_truth", {})
                    result["analysis"]["detection_results"]["video"] = {
                        "is_deepfake": gt.get("manipulation_type") == "deepfake_video",
                        "confidence": gt.get("confidence", 0.5),
                        "manipulation_markers": gt.get("manipulation_markers", [])
                    }

                if media_type == "image" and self.meme_detector:
                    meme_result = self.meme_detector.analyze(media_item["url"])
                    result["analysis"]["detection_results"]["image"] = meme_result
                elif media_type == "image":
                    # Mock image analysis
                    gt = post.get("ground_truth", {})
                    result["analysis"]["detection_results"]["image"] = {
                        "is_manipulated": gt.get("is_misinfo", False),
                        "confidence": gt.get("confidence", 0.5),
                        "manipulation_type": gt.get("manipulation_type")
                    }

        # Calculate overall score
        detection_results = result["analysis"]["detection_results"]
        if detection_results:
            confidences = [
                r.get("confidence", 0.0)
                for r in detection_results.values()
            ]
            result["analysis"]["confidence"] = sum(confidences) / len(confidences)
            result["analysis"]["is_misinfo"] = any(
                r.get("is_misinfo") or r.get("is_deepfake") or r.get("is_manipulated")
                for r in detection_results.values()
            )

        # Generate evidence
        result["analysis"]["evidence"] = self._generate_evidence(post, result["analysis"])

        return result

    def _generate_evidence(self, post: Dict[str, Any], analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate evidence items for UI display."""
        evidence = []

        # Add text-based evidence
        text_result = analysis["detection_results"].get("text", {})
        if text_result.get("red_flags"):
            evidence.append({
                "type": "text_analysis",
                "title": "Suspicious Language Patterns Detected",
                "description": f"Found {len(text_result['red_flags'])} red flags: {', '.join(text_result['red_flags'])}",
                "severity": "high" if len(text_result['red_flags']) >= 3 else "medium"
            })

        # Add video evidence
        video_result = analysis["detection_results"].get("video", {})
        if video_result.get("is_deepfake"):
            markers = video_result.get("manipulation_markers", [])
            evidence.append({
                "type": "deepfake_detection",
                "title": "Deepfake Video Detected",
                "description": f"Found manipulation markers: {', '.join(markers)}",
                "severity": "critical"
            })

        # Add image evidence
        image_result = analysis["detection_results"].get("image", {})
        if image_result.get("is_manipulated"):
            evidence.append({
                "type": "image_manipulation",
                "title": "Image Manipulation Detected",
                "description": f"Type: {image_result.get('manipulation_type', 'unknown')}",
                "severity": "high"
            })

        return evidence

    def process_all(self) -> Dict[str, Any]:
        """Process all demo posts and save results."""
        print("\n🔍 Starting Adversarial Misinfo Defense Demo Pipeline")
        print("=" * 60)

        posts = self.load_posts()
        results = []

        misinfo_count = 0
        legitimate_count = 0

        for i, post in enumerate(posts, 1):
            print(f"\nAnalyzing post {i}/{len(posts)}: {post['id']}")
            result = self.analyze_post(post)
            results.append(result)

            if result["analysis"]["is_misinfo"]:
                misinfo_count += 1
                print(f"  ⚠️  MISINFO DETECTED - Confidence: {result['analysis']['confidence']:.2%}")
            else:
                legitimate_count += 1
                print(f"  ✓ Legitimate content - Confidence: {result['analysis']['confidence']:.2%}")

        # Save results
        output_file = self.output_path / "analysis_results.json"
        summary = {
            "demo_name": "Adversarial Misinfo Defense",
            "processed_at": datetime.utcnow().isoformat(),
            "total_posts": len(posts),
            "misinfo_detected": misinfo_count,
            "legitimate_content": legitimate_count,
            "detection_rate": misinfo_count / len(posts) if posts else 0,
            "results": results
        }

        with open(output_file, "w") as f:
            json.dump(summary, f, indent=2)

        print(f"\n{'=' * 60}")
        print(f"✓ Analysis complete!")
        print(f"  Total posts: {len(posts)}")
        print(f"  Misinfo detected: {misinfo_count}")
        print(f"  Legitimate: {legitimate_count}")
        print(f"  Detection rate: {summary['detection_rate']:.1%}")
        print(f"\n📊 Results saved to: {output_file}")

        return summary


def main():
    """Main entry point for demo data loading."""
    base_path = Path(__file__).parent.parent
    data_path = base_path / "datasets"
    output_path = base_path / "output"

    loader = DemoDataLoader(data_path, output_path)
    loader.process_all()


if __name__ == "__main__":
    main()
