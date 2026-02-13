import os
import sys
import logging
import argparse
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from neo4j import GraphDatabase, basic_auth

# Add tool directory to path for local imports
tool_dir = Path(__file__).resolve().parent
sys.path.append(str(tool_dir))

from lib import reservoir_sample, calculate_skewness, calculate_top_k_mass

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("graph-shape-guardrail")

METRICS_FILE = Path("tools/graph-shape-guardrail/metrics.json")

def get_neo4j_driver(uri, username, password):
    return GraphDatabase.driver(uri, auth=basic_auth(username, password))

def stream_degrees(driver, label):
    """
    Streams degrees for a given label.
    """
    # Sanitize label (basic) to prevent injection if not trusted, though arg is usually safe
    if not label.isidentifier():
        # Fallback for complex labels if needed, or just warn
        logger.warning(f"Label '{label}' might need quoting.")

    query = f"MATCH (n:`{label}`) WITH n, size((n)-->) AS deg RETURN deg"
    logger.info(f"Executing query for label '{label}'...")

    with driver.session() as session:
        result = session.run(query)
        for record in result:
            yield record["deg"]

def load_metrics():
    if not METRICS_FILE.exists():
        return []
    try:
        with open(METRICS_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        logger.warning(f"Could not decode {METRICS_FILE}, starting fresh.")
        return []

def save_metrics(metrics):
    # Ensure directory exists
    METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)

def calculate_baseline(metrics, label, days=14):
    """
    Calculates avg skew and top1p_mass for the given label over the last 'days'.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    relevant = []

    for m in metrics:
        if m.get("label") != label:
            continue
        try:
            ts = datetime.fromisoformat(m["timestamp"])
            if ts >= cutoff:
                relevant.append(m)
        except ValueError:
            continue

    if not relevant:
        return None

    avg_skew = sum(m["skew"] for m in relevant) / len(relevant)
    avg_top1p = sum(m["top1p_mass"] for m in relevant) / len(relevant)

    return {
        "skew_avg": avg_skew,
        "top1p_avg": avg_top1p,
        "count": len(relevant)
    }

def main():
    parser = argparse.ArgumentParser(description="Graph Shape Guardrail")
    parser.add_argument("--label", required=True, help="The node label to check")
    parser.add_argument("--reservoir-size", type=int, default=50000, help="Reservoir size for sampling")
    parser.add_argument("--metrics-file", type=str, help="Path to metrics file (override default)")

    # Optional connection args, otherwise use env vars
    parser.add_argument("--uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--username", default=os.getenv("NEO4J_USERNAME", "neo4j"))
    parser.add_argument("--password", default=os.getenv("NEO4J_PASSWORD", "password"))

    args = parser.parse_args()

    if args.metrics_file:
        global METRICS_FILE
        METRICS_FILE = Path(args.metrics_file)

    logger.info(f"Connecting to Neo4j at {args.uri}")
    driver = None
    try:
        driver = get_neo4j_driver(args.uri, args.username, args.password)
        driver.verify_connectivity()
        logger.info("Connected.")

        # Stream and sample
        logger.info(f"Sampling degrees for label: {args.label}")
        degree_stream = stream_degrees(driver, args.label)
        degrees = reservoir_sample(degree_stream, k=args.reservoir_size)

        count = len(degrees)
        logger.info(f"Sampled {count} nodes.")

        if count == 0:
            logger.warning("No nodes found for this label.")
            return

        # Compute metrics
        skew = calculate_skewness(degrees)
        top1p = calculate_top_k_mass(degrees, top_percent=0.01)
        mean_deg = sum(degrees) / count

        current_metric = {
            "label": args.label,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "skew": skew,
            "top1p_mass": top1p,
            "mean_deg": mean_deg,
            "sample_count": count
        }

        logger.info(f"Metrics for {args.label}:")
        logger.info(f"  Count: {count}")
        logger.info(f"  Mean Degree: {mean_deg:.2f}")
        logger.info(f"  Skewness: {skew:.4f}")
        logger.info(f"  Top 1% Mass: {top1p:.4%}")

        # Load history and check baseline
        history = load_metrics()
        baseline = calculate_baseline(history, args.label)

        failed = False
        if baseline:
            logger.info(f"Baseline (last 14 days, n={baseline['count']}):")
            logger.info(f"  Avg Skew: {baseline['skew_avg']:.4f}")
            logger.info(f"  Avg Top 1% Mass: {baseline['top1p_avg']:.4%}")

            delta_skew = abs(skew - baseline['skew_avg'])
            delta_top1p_points = (top1p - baseline['top1p_avg']) * 100 # percentage points

            logger.info(f"Deltas:")
            logger.info(f"  Delta Skew: {delta_skew:.4f}")
            logger.info(f"  Delta Top 1% Mass (pp): {delta_top1p_points:.2f}")

            if delta_skew > 0.5:
                logger.error("ALERT: Skewness shift > 0.5")
                failed = True

            if delta_top1p_points > 5.0:
                logger.error("ALERT: Top 1% Mass shift > 5 percentage points")
                failed = True
        else:
            logger.info("No baseline found. Establishing first data point.")

        # Save current metric
        history.append(current_metric)
        save_metrics(history)

        if failed:
            sys.exit(1)

    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)
    finally:
        if driver:
            driver.close()

if __name__ == "__main__":
    main()
