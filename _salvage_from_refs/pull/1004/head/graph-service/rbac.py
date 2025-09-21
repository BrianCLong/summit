from typing import Dict, Tuple

from prometheus_client import Counter

# Counter for RBAC denied queries
rbac_denied_total = Counter("rbac_denied_queries_total", "RBAC denied queries")


def scope_cypher(
    base_query: str, role: str, user: str, permissions: list[str] | None = None
) -> Tuple[str, Dict[str, str]]:
    """Apply role based visibility rules to the given Cypher query.

    Analysts can only see nodes they created unless they have the ``group:view``
    permission. Reviewers and admins bypass the restriction.
    """
    permissions = permissions or []
    if role in {"reviewer", "admin"} or "group:view" in permissions:
        return base_query, {}
    scoped = f"{base_query} WHERE n.created_by = $user"
    return scoped, {"user": user}


def check_access(record: Dict[str, str], role: str, user: str, permissions: list[str] | None = None) -> None:
    """Raise ``PermissionError`` if the user cannot access the record."""
    permissions = permissions or []
    if role in {"reviewer", "admin"} or "group:view" in permissions:
        return
    if record.get("created_by") != user:
        rbac_denied_total.inc()
        raise PermissionError("RBAC: access denied")
