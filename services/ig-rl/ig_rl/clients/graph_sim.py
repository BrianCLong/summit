"""Client for interacting with IntelGraph's COA and simulation capabilities."""

from __future__ import annotations

from typing import Any


class GraphSimulationClient:
    """Lightweight wrapper around the what-if simulator endpoints."""

    def __init__(self, graphql_client) -> None:
        self._graphql = graphql_client

    async def start_session(self, case_id: str) -> dict[str, Any]:
        query = """
        mutation StartCoaSession($caseId: ID!) {
            startCoaSession(caseId: $caseId) {
                sessionId
                initialState
                candidateSteps
            }
        }
        """
        result = await self._graphql.execute(query, {"caseId": case_id})
        return result.get("startCoaSession", {})

    async def apply(self, session_id: str, step_id: str) -> dict[str, Any]:
        query = """
        mutation ApplyStep($sessionId: ID!, $stepId: ID!) {
            applyCoaStep(sessionId: $sessionId, stepId: $stepId) {
                state
                candidateSteps
                metrics
                terminal
            }
        }
        """
        result = await self._graphql.execute(query, {"sessionId": session_id, "stepId": step_id})
        return result.get("applyCoaStep", {})

    async def snapshot(self, session_id: str) -> dict[str, Any]:
        query = """
        query Snapshot($sessionId: ID!) {
            coaSnapshot(sessionId: $sessionId) {
                state
                metrics
            }
        }
        """
        result = await self._graphql.execute(query, {"sessionId": session_id})
        return result.get("coaSnapshot", {})
