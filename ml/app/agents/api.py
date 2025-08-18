from fastapi import APIRouter, HTTPException

from .autonomous_orchestrator import (
    AutonomousOrchestrator,
    create_graph_analysis_agent,
    create_quantum_optimization_agent,
)

router = APIRouter(prefix="/agents", tags=["agents"])
_orchestrator = AutonomousOrchestrator()


@router.post("/{agent_type}/{agent_id}")
def deploy_agent(agent_type: str, agent_id: str):
    """Dynamically deploy a new agent."""
    if agent_type == "graph":
        agent = _orchestrator.deploy_agent(create_graph_analysis_agent, agent_id)
    elif agent_type == "quantum":
        agent = _orchestrator.deploy_agent(create_quantum_optimization_agent, agent_id)
    else:
        raise HTTPException(status_code=400, detail="unsupported agent type")
    return {"agent_id": agent.agent_id}


@router.get("")
def list_agents():
    """List registered agents."""
    return {"agents": list(_orchestrator.agents.keys())}


@router.post("/{agent_id}/heartbeat")
def heartbeat(agent_id: str):
    agent = _orchestrator.agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="agent not found")
    agent.heartbeat()
    return {"status": "ok"}
