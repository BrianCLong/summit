from __future__ import annotations

import dataclasses
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from summit.registry.model import AgentDefinition, RegistryDocument, RiskTier
from summit.registry.store import load_registry, save_registry
from summit.governance.audit import emit, AuditEvent

class RegistryService:
    def __init__(self, registry_path: str = "summit/registry/data/registry.json"):
        self.registry_path = registry_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)

    def _load(self) -> RegistryDocument:
        try:
            return load_registry(self.registry_path)
        except FileNotFoundError:
            return RegistryDocument(version="1.0", capabilities=[], agents=[])

    def _save(self, doc: RegistryDocument):
        save_registry(self.registry_path, doc)

    def create_agent(self, definition: AgentDefinition) -> AgentDefinition:
        doc = self._load()
        if any(a.id == definition.id for a in doc.agents):
            raise ValueError(f"Agent with ID {definition.id} already exists.")

        new_agents = list(doc.agents)
        new_agents.append(definition)
        new_doc = dataclasses.replace(doc, agents=new_agents)
        self._save(new_doc)

        emit(AuditEvent(
            event_type="agent_registered",
            actor="system",
            action="create",
            decision="allow",
            metadata=dataclasses.asdict(definition),
            evidence_id=None
        ))
        return definition

    def get_agent(self, agent_id: str) -> Optional[AgentDefinition]:
        doc = self._load()
        for agent in doc.agents:
            if agent.id == agent_id:
                return agent
        return None

    def update_agent(self, agent_id: str, updates: Dict[str, Any]) -> Optional[AgentDefinition]:
        doc = self._load()
        agent_idx = next((i for i, a in enumerate(doc.agents) if a.id == agent_id), -1)

        if agent_idx == -1:
            return None

        current_agent = doc.agents[agent_idx]

        # Handle RiskTier conversion if present in updates
        if "risk_tier" in updates and isinstance(updates["risk_tier"], str):
             updates["risk_tier"] = RiskTier(updates["risk_tier"])

        # Auto-update updated_at
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated_agent = dataclasses.replace(current_agent, **updates)

        new_agents = list(doc.agents)
        new_agents[agent_idx] = updated_agent
        new_doc = dataclasses.replace(doc, agents=new_agents)
        self._save(new_doc)

        emit(AuditEvent(
            event_type="agent_updated",
            actor="system",
            action="update",
            decision="allow",
            metadata={"agent_id": agent_id, "updates": updates},
            evidence_id=None
        ))

        return updated_agent

    def list_agents(self, filters: Dict[str, Any] = None) -> List[AgentDefinition]:
        doc = self._load()
        agents = doc.agents

        if not filters:
            return agents

        filtered = []
        for agent in agents:
            match = True
            for k, v in filters.items():
                if hasattr(agent, k) and getattr(agent, k) != v:
                    match = False
                    break
            if match:
                filtered.append(agent)
        return filtered
