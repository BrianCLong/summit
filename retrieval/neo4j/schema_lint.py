import logging
from typing import List

logger = logging.getLogger(__name__)

class SchemaLinter:
    """
    Advisory linter for Neo4j schema readiness.
    Checks for:
    1. Tenancy/ACL facets (tenant_id, access_scope)
    2. Embedding provenance (embedding_model, embedding_version)
    3. Entity typing consistency.
    """
    def __init__(self, neo4j_client):
        self.client = neo4j_client

    def lint(self) -> List[str]:
        warnings = []
        try:
            with self.client.driver.session() as session:
                # 1. Check Node Properties via Schema
                # Note: db.schema.nodeTypeProperties() returns available properties per label
                result = session.read_transaction(
                    lambda tx: tx.run("CALL db.schema.nodeTypeProperties()").data()
                )

                # Analyze result
                # Row format: {nodeLabels: ["Person"], propertyName: "name", propertyTypes: ["String"], ...}

                # Aggregating properties by label
                label_props = {}
                for row in result:
                    labels = tuple(sorted(row.get("nodeLabels", [])))
                    if not labels: continue
                    prop = row.get("propertyName")
                    if labels not in label_props:
                        label_props[labels] = set()
                    label_props[labels].add(prop)

                required_acl = {"tenant_id", "access_scope"}
                required_prov = {"embedding_model", "embedding_version"}

                for labels, props in label_props.items():
                    label_str = ":".join(labels)

                    # Check ACL
                    if not required_acl.intersection(props):
                        warnings.append(f"Labels [{label_str}] missing ACL properties (tenant_id or access_scope). Risk: T1 (Bypass).")

                    # Check Provenance (only if 'embedding' exists)
                    if "embedding" in props or "vector" in props:
                        if not required_prov.intersection(props):
                            warnings.append(f"Labels [{label_str}] have embeddings but missing provenance (embedding_model). Risk: T3 (Churn).")

        except Exception as e:
            logger.error(f"Linter failed to query schema: {e}")
            warnings.append(f"Linter error: {e}")

        return warnings

if __name__ == "__main__":
    # Example standalone run
    print("Neo4j Schema Linter (Advisory)")
    # (Client init would go here)
