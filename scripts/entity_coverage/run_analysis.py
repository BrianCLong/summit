import argparse
import sys
import os

# Add the script directory to sys.path so we can import our lib
sys.path.append(os.path.join(os.path.dirname(__file__)))

from lib.db import get_pg_connection, get_neo4j_driver
from lib.analyzer import EntityCoverageAnalyzer
from lib.report import ReportGenerator

def main():
    parser = argparse.ArgumentParser(description="Summit Entity Coverage Analysis")
    parser.add_argument("--tenant-id", help="Filter by tenant ID")
    parser.add_argument("--output-dir", default="reports/entity-coverage", help="Directory to save reports")

    args = parser.parse_args()

    print("Connecting to databases...")
    pg_conn = get_pg_connection()
    neo4j_driver = get_neo4j_driver()

    if not pg_conn:
        print("Error: Primary database (PostgreSQL) connection failed. Analysis cannot proceed.")
        sys.exit(1)

    print(f"Running analysis for tenant: {args.tenant_id or 'All'}")
    analyzer = EntityCoverageAnalyzer(pg_conn, neo4j_driver)
    results = analyzer.analyze(tenant_id=args.tenant_id)

    print(f"Generating reports in {args.output_dir}...")
    reporter = ReportGenerator(results, args.output_dir)
    reporter.generate()

    print("Analysis complete.")
    pg_conn.close()
    if neo4j_driver:
        neo4j_driver.close()

if __name__ == "__main__":
    main()
