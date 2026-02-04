from typing import List, Dict, Any, Optional
from .router import ShardRouter
from .shard_plan import ShardPlan

class Neo4jShardExecutor:
    def __init__(self, router: ShardRouter):
        self.router = router

    def execute_retrieval(self, query: str, plan: ShardPlan) -> Dict[str, Any]:
        shards = self.router.select_graph_shards(plan)
        results = []
        errors = []

        for shard_id in shards:
            try:
                shard_result = self._query_shard(shard_id, query)
                results.append(shard_result)
            except Exception as e:
                errors.append(f"Shard {shard_id} failed: {e}")
                # Log error here

        if not results and errors:
             # If all failed or partial failure deemed critical?
             # For now, if we have NO results and SOME errors, we fallback.
             # If we have SOME results, we return partial?
             # Plan says "Fallback gate: shard execution errors must not break retrieval; vector-only fallback is used."
             # Assuming this method returns graph results to be merged with vector results elsewhere,
             # or this method handles the fallback return signal.
             return {"results": [], "errors": errors, "fallback": True}

        return {"results": results, "errors": errors, "fallback": False}

    def _query_shard(self, shard_id: str, query: str) -> Any:
        # Stub for actual Neo4j call
        # In production this would use a connection pool keyed by shard_id
        if shard_id == "fail":
            raise ConnectionError("Simulated failure")
        return {"nodes": [], "edges": [], "shard": shard_id}
