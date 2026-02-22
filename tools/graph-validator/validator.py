import os
import sys
import json
import logging
import argparse
import random
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("graph-validator")

# Try importing scientific libraries
try:
    import numpy as np
    from scipy import stats
except ImportError:
    logger.warning("Scientific libraries (numpy, scipy) not found. KS test will not work.")
    np = None
    stats = None

try:
    from neo4j import GraphDatabase
except ImportError:
    logger.warning("neo4j driver not found.")
    GraphDatabase = None


class DegreeSampler:
    def __init__(self, uri, user, password):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        if GraphDatabase:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        if self.driver:
            self.driver.close()

    def fetch_sample(self, sample_size: int = 100000, label: Optional[str] = None) -> List[int]:
        """
        Fetches a random sample of node degrees.
        Uses `rand()` to sample if the graph is large.
        """
        if not self.driver:
            raise RuntimeError("Neo4j driver is not initialized.")

        # Estimate total count to adjust sampling probability if needed,
        # but for simplicity we'll just use a LIMIT on a random sort or random filter.
        # A true reservoir sample on DB side is complex without scanning all.
        # We'll use a simple approach: MATCH (n) WHERE rand() < 0.1 RETURN count((n)--()) LIMIT X
        # Adjust 0.1 based on graph size if known, or just use LIMIT with a random shuffle (expensive)
        # or just random walk.
        # For this implementation, we assume a "WHERE rand() < P" approach is sufficient or just LIMIT.

        # Let's try to get a bit more robust:
        # We want roughly 'sample_size'.

        query = """
        MATCH (n)
        WHERE rand() < 0.5
        WITH n LIMIT $limit
        RETURN count { (n)--() } as degree
        """

        if label:
            query = query.replace("MATCH (n)", f"MATCH (n:{label})")

        degrees = []
        with self.driver.session() as session:
            result = session.run(query, limit=sample_size)
            degrees = [record["degree"] for record in result]

        logger.info(f"Fetched {len(degrees)} degrees from Neo4j.")
        return degrees

class DriftDetector:
    def __init__(self, alpha: float = 0.01, threshold_d: float = 0.05):
        self.alpha = alpha
        self.threshold_d = threshold_d

    def run_test(self, baseline_degrees: List[int], live_degrees: List[int]) -> Dict[str, Any]:
        if not np or not stats:
            raise RuntimeError("Scientific libraries not available.")

        # Convert to numpy arrays
        d_base = np.array(baseline_degrees)
        d_live = np.array(live_degrees)

        # KS Test
        ks_result = stats.ks_2samp(d_base, d_live)

        # Calculate top-k mass delta (simple binning for reporting)
        # We'll look at bins: 0, 1, 2-5, 6-20, 21-100, >100
        bins = [0, 1, 2, 5, 20, 100, float('inf')]
        bin_labels = ["0", "1", "2-5", "6-20", "21-100", ">100"]

        base_hist, _ = np.histogram(d_base, bins=bins)
        live_hist, _ = np.histogram(d_live, bins=bins)

        base_dist = base_hist / len(d_base)
        live_dist = live_hist / len(d_live)

        topk_deltas = []
        for i, label in enumerate(bin_labels):
             delta = live_dist[i] - base_dist[i]
             topk_deltas.append({
                 "bin": label,
                 "baseline": float(round(base_dist[i], 4)),
                 "live": float(round(live_dist[i], 4)),
                 "delta": float(round(delta, 4))
             })

        # Sort by absolute delta
        topk_deltas.sort(key=lambda x: abs(x["delta"]), reverse=True)

        # Determine status
        is_drift = ks_result.statistic > self.threshold_d or ks_result.pvalue < self.alpha
        status = "DRIFT" if is_drift else "OK"

        return {
            "test": "two_sample_KS_online",
            "D": float(round(ks_result.statistic, 4)),
            "p": float(round(ks_result.pvalue, 6)),
            "n_baseline": len(d_base),
            "n_live": len(d_live),
            "topk_mass_delta": topk_deltas[:3], # Top 3 deltas
            "status": status
        }

def save_baseline(degrees: List[int], filepath: str):
    with open(filepath, 'w') as f:
        json.dump(degrees, f)
    logger.info(f"Baseline saved to {filepath}")

def load_baseline(filepath: str) -> List[int]:
    with open(filepath, 'r') as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser(description="Graph Degree Distribution Drift Validator")
    parser.add_argument("--mode", choices=["baseline", "validate"], required=True, help="Mode of operation")
    parser.add_argument("--baseline-path", default="degree_baseline.json", help="Path to baseline file")
    parser.add_argument("--sample-size", type=int, default=100000, help="Number of nodes to sample")
    parser.add_argument("--neo4j-uri", default=os.environ.get("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--neo4j-user", default=os.environ.get("NEO4J_USER", "neo4j"))
    parser.add_argument("--neo4j-password", default=os.environ.get("NEO4J_PASSWORD", "password"))
    parser.add_argument("--output", help="Output file for JSON report")

    args = parser.parse_args()

    sampler = DegreeSampler(args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    try:
        degrees = sampler.fetch_sample(sample_size=args.sample_size)

        if args.mode == "baseline":
            save_baseline(degrees, args.baseline_path)
            print(json.dumps({"status": "BASELINE_CREATED", "n": len(degrees), "path": args.baseline_path}))

        elif args.mode == "validate":
            if not os.path.exists(args.baseline_path):
                logger.error(f"Baseline file not found: {args.baseline_path}")
                sys.exit(1)

            baseline_degrees = load_baseline(args.baseline_path)

            detector = DriftDetector()
            report = detector.run_test(baseline_degrees, degrees)

            report["window_start"] = datetime.now(timezone.utc).isoformat()
            # Just a placeholder for window_end as we are sampling 'now'
            report["window_end"] = datetime.now(timezone.utc).isoformat()

            json_output = json.dumps(report, indent=2)
            print(json_output)

            if args.output:
                with open(args.output, 'w') as f:
                    f.write(json_output)

            if report["status"] == "DRIFT":
                logger.warning("Drift detected!")
                # We can exit with code 1 if we want to fail CI, but user said "Fail CI if D > 0.05 || p < 0.01"
                # so usually that means exit code 1.
                sys.exit(1)

    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)
    finally:
        sampler.close()

if __name__ == "__main__":
    main()
