from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

from summit.influence.decoy_grid import DecoyNarrativeEngine, CounterTerrainMapper

router = APIRouter(prefix="/api/narrative", tags=["Narrative"])

class DecoyRequest(BaseModel):
    target_narrative: str

@router.post("/deploy-decoy")
async def deploy_decoy(req: DecoyRequest) -> Dict[str, Any]:
    """
    Deploy a decoy narrative against a target adversary narrative.
    """
    engine = DecoyNarrativeEngine()
    result = engine.generate_decoy(req.target_narrative)
    return result

@router.get("/terrain-map")
async def get_terrain_map() -> Dict[str, List[Dict[str, Any]]]:
    """
    Return the narrative terrain map showing adversary footholds vs friendly terrain.
    """
    mapper = CounterTerrainMapper()
    return mapper.map_terrain()
