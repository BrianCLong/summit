import os
import sys
from neo4j import GraphDatabase, basic_auth

def check_indexes():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")

    driver = GraphDatabase.driver(uri, auth=basic_auth(user, password))
    required = ["idx_evidence_body", "idx_event_timestamp", "idx_evidence_of_confidence"]

    try:
        with driver.session() as session:
            result = session.run("SHOW INDEXES")
            online = [record["name"] for record in result if record["state"] == "ONLINE"]

            missing = [idx for idx in required if idx not in online]
            if missing:
                print(f"FAILED: Missing/offline indexes: {missing}")
                sys.exit(1)
            print("OK: All indexes ONLINE")
    finally:
        driver.close()

if __name__ == "__main__":
    check_indexes()
