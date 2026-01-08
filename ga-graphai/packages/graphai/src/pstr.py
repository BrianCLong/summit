from __future__ import annotations

import hashlib
import heapq
import random
from collections import defaultdict
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class PolicyDecision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    ALLOW_WITH_REDACTION = "ALLOW_WITH_REDACTION"


class PolicyDecisionRecord(BaseModel):
    decision: PolicyDecision
    reason: str
    mask_spec: dict[str, Any] | None = None


class Redaction(BaseModel):
    target_id: str
    mask_spec: dict[str, Any]


class UserContext(BaseModel):
    user_id: str
    roles: list[str] = Field(default_factory=list)
    tenant: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    clearances: list[str] = Field(default_factory=list)


class DeterminismWindow(BaseModel):
    start: str | None = None
    end: str | None = None


class DeterminismConfig(BaseModel):
    seed: int = 1337
    time_window: DeterminismWindow | None = None
    index_version: str | None = None


class RetrievalNode(BaseModel):
    id: str
    text: str | None = None
    label: str | None = None
    sensitivity_labels: list[str] = Field(default_factory=list)
    provenance: dict[str, Any] = Field(default_factory=dict)


class RetrievalEdge(BaseModel):
    source: str
    target: str
    rel_type: str | None = None
    weight: float | None = None
    timestamp: str | float | None = None
    sensitivity_labels: list[str] = Field(default_factory=list)
    provenance: dict[str, Any] = Field(default_factory=dict)


class PstrBudgets(BaseModel):
    max_hops: int = 3
    max_expansions: int = 500
    seed_k: int = 50
    rel_whitelist: list[str] | None = None


class PstrRequest(BaseModel):
    query: str
    nodes: list[RetrievalNode]
    edges: list[RetrievalEdge]
    top_k: int = 3
    user_ctx: UserContext
    purpose: str
    budgets: PstrBudgets = Field(default_factory=PstrBudgets)
    determinism: DeterminismConfig = Field(default_factory=DeterminismConfig)


class EvidencePath(BaseModel):
    nodes: list[str]
    edges: list[str]
    score: float
    relevance: float
    trust: float
    policy_decisions: list[PolicyDecisionRecord]
    redactions_applied: list[Redaction]


class EvidenceProgram(BaseModel):
    claims: list[str]
    evidence_paths: list[EvidencePath]
    policy_decisions: list[PolicyDecisionRecord]
    redactions: list[Redaction]
    determinism: dict[str, Any]


class PstrResponse(BaseModel):
    evidence_programs: list[EvidenceProgram]
    telemetry: dict[str, Any]


@dataclass
class PathCandidate:
    nodes: list[str]
    edges: list[str]
    rel: float
    trust: float
    cost: float
    hops: int
    seed_id: str
    policy_decisions: list[PolicyDecisionRecord] = field(default_factory=list)
    redactions: list[Redaction] = field(default_factory=list)


class PolicyEngine:
    @staticmethod
    def _scope_hash(user_ctx: UserContext, purpose: str) -> str:
        hasher = hashlib.sha256()
        hasher.update(user_ctx.user_id.encode())
        hasher.update("|".join(sorted(user_ctx.roles)).encode())
        if purpose:
            hasher.update(purpose.encode())
        return hasher.hexdigest()

    @staticmethod
    def check_sensitivity(
        labels: Iterable[str], user_ctx: UserContext, purpose: str
    ) -> PolicyDecisionRecord:
        sensitivity = set(labels)
        clearances = set(user_ctx.clearances)
        if "forbidden" in sensitivity:
            return PolicyDecisionRecord(
                decision=PolicyDecision.DENY, reason="Contains forbidden label", mask_spec=None
            )
        if sensitivity and not sensitivity.issubset(clearances):
            missing = sorted(list(sensitivity - clearances))
            return PolicyDecisionRecord(
                decision=PolicyDecision.ALLOW_WITH_REDACTION,
                reason=f"Redacted for sensitivity: {', '.join(missing)}",
                mask_spec={"mask": "***", "labels": missing},
            )
        return PolicyDecisionRecord(
            decision=PolicyDecision.ALLOW, reason="Clearance satisfied", mask_spec=None
        )


def _semantic_similarity(query: str, text: str | None) -> float:
    if not text:
        return 0.0
    q_tokens = set(query.lower().split())
    t_tokens = set(text.lower().split())
    if not q_tokens or not t_tokens:
        return 0.0
    overlap = len(q_tokens.intersection(t_tokens))
    union = len(q_tokens.union(t_tokens))
    return overlap / union


def _trust_score(provenance: Mapping[str, Any]) -> float:
    base = float(provenance.get("trust", 0.5))
    freshness = float(provenance.get("freshness", 1.0))
    chain_integrity = float(provenance.get("chain_integrity", 1.0))
    conflict_penalty = float(provenance.get("conflict", 0.0))
    score = base * freshness * chain_integrity
    score -= conflict_penalty
    return max(0.0, min(1.0, score))


def _score_path(candidate: PathCandidate) -> float:
    alpha, beta, gamma = 0.6, 0.4, 0.15
    return (alpha * candidate.rel + beta * candidate.trust) - gamma * candidate.cost


def _path_signature(
    candidate: PathCandidate, policy_scope: str, index_version: str | None
) -> tuple[Any, ...]:
    rel_types = tuple(sorted(candidate.edges))
    nodes_hash = hashlib.md5("|".join(sorted(candidate.nodes)).encode()).hexdigest()
    return (
        candidate.seed_id,
        candidate.hops,
        rel_types,
        nodes_hash,
        policy_scope,
        index_version,
    )


def _is_acceptable(candidate: PathCandidate, threshold: float) -> bool:
    return candidate.rel >= threshold


def _extend_path(
    base: PathCandidate,
    edge: RetrievalEdge,
    dest_node: RetrievalNode,
    query: str,
) -> PathCandidate:
    next_nodes = base.nodes + [dest_node.id]
    next_edges = base.edges + [edge.rel_type or "edge"]
    next_rel = (
        base.rel * base.hops + _semantic_similarity(query, dest_node.text or dest_node.label)
    ) / (base.hops + 1)
    edge_trust = _trust_score(edge.provenance)
    node_trust = _trust_score(dest_node.provenance)
    next_trust = 0.5 * base.trust + 0.25 * edge_trust + 0.25 * node_trust
    return PathCandidate(
        nodes=next_nodes,
        edges=next_edges,
        rel=next_rel,
        trust=next_trust,
        cost=base.cost + 1.0 + (1.0 - edge_trust),
        hops=base.hops + 1,
        seed_id=base.seed_id,
        policy_decisions=list(base.policy_decisions),
        redactions=list(base.redactions),
    )


def _compile_evidence(candidate: PathCandidate, determinism: DeterminismConfig) -> EvidenceProgram:
    decisions = candidate.policy_decisions
    claims = [f"Path covering {len(candidate.nodes)} nodes with trust {candidate.trust:.2f}"]
    evidence_path = EvidencePath(
        nodes=candidate.nodes,
        edges=candidate.edges,
        score=_score_path(candidate),
        relevance=candidate.rel,
        trust=candidate.trust,
        policy_decisions=decisions,
        redactions_applied=candidate.redactions,
    )
    return EvidenceProgram(
        claims=claims,
        evidence_paths=[evidence_path],
        policy_decisions=decisions,
        redactions=candidate.redactions,
        determinism={
            "seed": determinism.seed,
            "index_version": determinism.index_version,
            "time_window": determinism.time_window.model_dump()
            if determinism.time_window
            else None,
        },
    )


def pstr_search(request: PstrRequest) -> PstrResponse:
    random.seed(request.determinism.seed)
    policy_scope = PolicyEngine._scope_hash(request.user_ctx, request.purpose)
    adjacency: dict[str, list[RetrievalEdge]] = defaultdict(list)
    for edge in request.edges:
        adjacency[edge.source].append(edge)

    seeds = sorted(
        request.nodes,
        key=lambda node: _semantic_similarity(request.query, node.text or node.label)
        + _trust_score(node.provenance),
        reverse=True,
    )[: request.budgets.seed_k]

    queue: list[tuple[float, PathCandidate]] = []
    cache: dict[tuple[Any, ...], PathCandidate] = {}
    cache_hits = 0
    results: list[EvidenceProgram] = []
    expansions = 0

    for seed in seeds:
        policy_decision = PolicyEngine.check_sensitivity(
            seed.sensitivity_labels, request.user_ctx, request.purpose
        )
        if policy_decision.decision == PolicyDecision.DENY:
            continue
        base = PathCandidate(
            nodes=[seed.id],
            edges=[],
            rel=_semantic_similarity(request.query, seed.text or seed.label),
            trust=_trust_score(seed.provenance),
            cost=0.0,
            hops=0,
            seed_id=seed.id,
            policy_decisions=[policy_decision],
            redactions=[],
        )
        if (
            policy_decision.decision == PolicyDecision.ALLOW_WITH_REDACTION
            and policy_decision.mask_spec
        ):
            base.redactions.append(
                Redaction(target_id=seed.id, mask_spec=policy_decision.mask_spec)
            )
        signature = _path_signature(base, policy_scope, request.determinism.index_version)
        cache[signature] = base
        heapq.heappush(queue, (-_score_path(base), base))

    while queue and len(results) < request.top_k and expansions < request.budgets.max_expansions:
        _, candidate = heapq.heappop(queue)
        expansions += 1
        if _is_acceptable(candidate, threshold=0.3):
            results.append(_compile_evidence(candidate, request.determinism))
            continue

        if candidate.hops >= request.budgets.max_hops:
            continue

        for edge in adjacency.get(candidate.nodes[-1], []):
            if request.budgets.rel_whitelist and edge.rel_type not in request.budgets.rel_whitelist:
                continue
            edge_policy = PolicyEngine.check_sensitivity(
                edge.sensitivity_labels, request.user_ctx, request.purpose
            )
            if edge_policy.decision == PolicyDecision.DENY:
                continue
            destination = next((node for node in request.nodes if node.id == edge.target), None)
            if destination is None:
                continue
            node_policy = PolicyEngine.check_sensitivity(
                destination.sensitivity_labels, request.user_ctx, request.purpose
            )
            if node_policy.decision == PolicyDecision.DENY:
                continue

            extended = _extend_path(candidate, edge, destination, request.query)
            extended.policy_decisions.append(edge_policy)
            extended.policy_decisions.append(node_policy)
            if (
                edge_policy.decision == PolicyDecision.ALLOW_WITH_REDACTION
                and edge_policy.mask_spec
            ):
                extended.redactions.append(
                    Redaction(
                        target_id=f"edge:{edge.source}->{edge.target}",
                        mask_spec=edge_policy.mask_spec,
                    )
                )
            if (
                node_policy.decision == PolicyDecision.ALLOW_WITH_REDACTION
                and node_policy.mask_spec
            ):
                extended.redactions.append(
                    Redaction(target_id=destination.id, mask_spec=node_policy.mask_spec)
                )

            signature = _path_signature(extended, policy_scope, request.determinism.index_version)
            existing = cache.get(signature)
            if existing and _score_path(existing) >= _score_path(extended):
                cache_hits += 1
                continue
            cache[signature] = extended
            heapq.heappush(queue, (-_score_path(extended), extended))

    telemetry = {
        "expansions": expansions,
        "cache_hits": cache_hits,
        "policy_scope": policy_scope,
    }
    ranked = sorted(results, key=lambda ep: ep.evidence_paths[0].score, reverse=True)[
        : request.top_k
    ]
    return PstrResponse(evidence_programs=ranked, telemetry=telemetry)
