import os
import sys
import json
from neo4j import GraphDatabase, basic_auth

def get_neo4j_client():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))

def check_indexes():
    driver = get_neo4j_client()
    required_indexes = {
        "idx_evidence_body",
        "idx_event_timestamp",
        "idx_evidence_of_confidence"
    }

    status = {}
    success = True

    try:
        with driver.session() as session:
            # Neo4j 4.4+ and 5.x support SHOW INDEXES
            result = session.run("SHOW INDEXES")
            found_indexes = {}
            for record in result:
                # In Neo4j 5.x, the column names are 'name' and 'state'
                name = record.get("name")
                state = record.get("state")
                if name:
                    found_indexes[name] = state

            for idx in required_indexes:
                state = found_indexes.get(idx)
                status[idx] = state
                if state != "ONLINE":
                    success = False

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        driver.close()

    output = {"success": success, "indexes": status}
    print(json.dumps(output, indent=2))
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    check_indexes()
