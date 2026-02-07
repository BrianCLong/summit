import argparse
import hashlib
import json
import logging
import os
from datetime import UTC, datetime, timezone

import psycopg2
import yaml
from neo4j import GraphDatabase

from graph_shape_guardrail.neo4j_client import Neo4jClient
from graph_shape_guardrail.policy import PolicyEngine
from graph_shape_guardrail.sampling import process_degree_stream
from graph_shape_guardrail.stats import calculate_skewness
from graph_shape_guardrail.topk import calculate_top_k_mass
from graph_shape_guardrail.validation import validate_artifact
from graph_shape_guardrail.warehouse import WarehouseClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("GSG")

def main():
    parser = argparse.ArgumentParser(description="Graph Shape Guardrail")
    parser.add_argument("--config", required=True, help="Path to config yaml")
    parser.add_argument("--tenant", default="default", help="Tenant ID")
    parser.add_argument("--graph-name", default="neo4j", help="Graph name in GDS")
    parser.add_argument("--window-start", required=True, help="Window start ISO timestamp")
    parser.add_argument("--window-end", required=True, help="Window end ISO timestamp")
    parser.add_argument("--out-dir", default="artifacts/graph-shape-guardrail", help="Output directory for evidence")
    parser.add_argument("--sample-k", type=int, default=50000, help="Sample size")
    parser.add_argument("--seed", default="v1", help="Deterministic seed version")
    parser.add_argument("--dry-run", action="store_true", help="Run without database connections (uses empty data)")
    args = parser.parse_args()

    if not os.path.exists(args.config):
        logger.error(f"Config file not found: {args.config}")
        return

    with open(args.config) as f:
        config = yaml.safe_load(f)

    # Database setup
    neo4j_client = None
    warehouse_client = None
    driver = None
    pg_conn = None

    if not args.dry_run:
        try:
            neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
            neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
            neo4j_password = os.environ.get("NEO4J_PASSWORD", "password")

            driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
            neo4j_client = Neo4jClient(driver)

            pg_host = os.environ.get("PG_HOST", "localhost")
            pg_port = os.environ.get("PG_PORT", "5432")
            pg_dbname = os.environ.get("PG_DBNAME", "intelgraph_db")
            pg_user = os.environ.get("PG_USER", "intelgraph_user")
            pg_password = os.environ.get("PG_PASSWORD", "intelgraph_password")

            pg_conn = psycopg2.connect(
                host=pg_host, port=pg_port, database=pg_dbname,
                user=pg_user, password=pg_password
            )
            warehouse_client = WarehouseClient(pg_conn)
        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            if driver:
                driver.close()
            if pg_conn:
                pg_conn.close()
            exit(1)

    # Prepare evidence directory
    run_id = hashlib.sha256(f"{args.tenant}-{args.window_end}".encode()).hexdigest()[:8]
    evidence_dir = os.path.join(args.out_dir, f"EVD-GSG-{run_id}")
    os.makedirs(evidence_dir, exist_ok=True)

    labels_config = config.get('labels', {})

    all_metrics = {}
    reports = {}
    overall_pass = True

    try:
        for label, label_config in labels_config.items():
            logger.info(f"Processing label: {label}")

            if args.dry_run:
                degrees_stream = iter([])
            else:
                degrees_stream = neo4j_client.stream_degrees_map(
                    args.graph_name,
                    label_config.get('node_labels', [label]),
                    label_config.get('relationship_types', []),
                    stable_key=label_config.get('stable_key', 'entity_id'),
                    orientation=label_config.get('orientation', 'NATURAL')
                )

            sample_with_keys, top_hubs, total_deg_sum, count = process_degree_stream(
                degrees_stream, args.sample_k, seed=args.seed
            )

            sample = [d for k, d in sample_with_keys]

            if not sample:
                logger.warning(f"No data for label {label}. Skipping.")
                continue

            skew = calculate_skewness(sample)
            top1p = calculate_top_k_mass(sample)
            mean_deg = sum(sample) / len(sample)

            metrics = {
                "tenant_id": args.tenant,
                "label": label,
                "window_start": args.window_start,
                "window_end": args.window_end,
                "sample_n": len(sample),
                "mean_deg": round(float(mean_deg), 6),
                "skew_deg": round(float(skew), 6),
                "top1p_mass": round(float(top1p), 6),
                "evidence_id": f"gsg.v1.{args.tenant}.{run_id}"
            }
            all_metrics[label] = metrics

            baseline = []
            if not args.dry_run:
                # 1. Fetch baseline BEFORE storing current
                baseline = warehouse_client.get_baseline_metrics(args.tenant, label, args.window_end)
                # 2. Store current
                warehouse_client.store_metrics(metrics)

            engine = PolicyEngine(label_config.get('thresholds', {}))
            passed, msg, report_data = engine.evaluate(metrics, baseline)

            # RCA support: add top hubs to report data
            report_data["top_hubs"] = top_hubs

            reports[label] = {
                "passed": passed,
                "message": msg,
                "metrics": metrics,
                "report_data": report_data
            }

            if not passed:
                overall_pass = False
                logger.error(f"Alert for {label}: {msg}")
            else:
                logger.info(f"Pass for {label}: {msg}")

        # Construct and validate artifacts
        metrics_artifact = all_metrics # In a multi-label run, schema might need adjustment or we loop
        # For simplicity, we'll validate the first label's metrics against metrics.schema.json
        if all_metrics:
            first_label = list(all_metrics.keys())[0]
            validate_artifact(all_metrics[first_label], "schemas/graph_shape_guardrail/metrics.schema.json")

        report_artifact = {
            "evidence_id": f"gsg.v1.{args.tenant}.{run_id}",
            "overall_pass": overall_pass,
            "reports": reports,
            "timestamp": datetime.now(UTC).isoformat()
        }
        validate_artifact(report_artifact, "schemas/graph_shape_guardrail/report.schema.json")

        stamp_artifact = {
            "tool_version": "1.0.0",
            "config_hash": hashlib.sha256(yaml.dump(config).encode()).hexdigest(),
            "deterministic_seed_version": args.seed,
            "runtime_metadata": {
                "tenant": args.tenant,
                "graph_name": args.graph_name,
                "sample_k": args.sample_k,
                "window_start": args.window_start,
                "window_end": args.window_end,
                "dry_run": args.dry_run
            }
        }
        validate_artifact(stamp_artifact, "schemas/graph_shape_guardrail/stamp.schema.json")

        # Write artifacts
        with open(os.path.join(evidence_dir, "metrics.json"), "w") as f:
            json.dump(all_metrics, f, indent=2, sort_keys=True)

        with open(os.path.join(evidence_dir, "report.json"), "w") as f:
            json.dump(report_artifact, f, indent=2, sort_keys=True)

        with open(os.path.join(evidence_dir, "stamp.json"), "w") as f:
            json.dump(stamp_artifact, f, indent=2, sort_keys=True)

    finally:
        if driver:
            driver.close()
        if pg_conn:
            pg_conn.close()

    logger.info(f"Evidence written to {evidence_dir}")
    if not overall_pass:
        logger.error("Guardrail FAILED")
        exit(1)
    else:
        logger.info("Guardrail PASSED")

if __name__ == "__main__":
    main()
