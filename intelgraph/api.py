"""
FastAPI router for IntelGraph minimal slice.

Provides REST endpoints for:
- Entities: create, list
- Claims: create, list
- Decisions: create, list
- Entity context: get all claims + decisions for an entity
"""

import json
from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from .core.database import get_database
from .core.models import (
    Claim,
    ClaimBase,
    ClaimRead,
    Decision,
    DecisionBase,
    DecisionRead,
    Entity,
    EntityBase,
    EntityRead,
    Source,
    SourceBase,
    SourceRead,
)

# Initialize FastAPI app
app = FastAPI(
    title="IntelGraph API",
    description="Minimal decision & claims knowledge graph",
    version="0.1.0",
)

# Database instance
db = get_database()


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "name": "IntelGraph API",
        "version": "0.1.0",
        "endpoints": {
            "entities": "/entities",
            "claims": "/claims",
            "decisions": "/decisions",
            "sources": "/sources",
            "entity_context": "/entities/{entity_id}/context",
        },
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Entity endpoints


@app.post("/entities", response_model=EntityRead, status_code=201)
def create_entity(entity_data: EntityBase):
    """
    Create a new entity.

    Args:
        entity_data: Entity information (type, labels)

    Returns:
        Created entity with ID and timestamps
    """
    entity = Entity.model_validate(entity_data)
    created = db.create_entity(entity)
    return created


@app.get("/entities", response_model=List[EntityRead])
def list_entities(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    List all entities with pagination.

    Args:
        limit: Maximum number of results (max 1000)
        offset: Number of results to skip

    Returns:
        List of entities
    """
    entities = db.list_entities(limit=limit, offset=offset)
    return entities


@app.get("/entities/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int):
    """
    Get entity by ID.

    Args:
        entity_id: Entity ID

    Returns:
        Entity details

    Raises:
        HTTPException: 404 if entity not found
    """
    entity = db.get_entity(entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    return entity


# Claim endpoints


@app.post("/claims", response_model=ClaimRead, status_code=201)
def create_claim(claim_data: ClaimBase):
    """
    Create a new claim.

    Args:
        claim_data: Claim information (entity_id, predicate, value, source_ids, policy_labels)

    Returns:
        Created claim with ID and timestamp

    Raises:
        HTTPException: 404 if referenced entity doesn't exist
    """
    # Validate entity exists
    entity = db.get_entity(claim_data.entity_id)
    if entity is None:
        raise HTTPException(
            status_code=404, detail=f"Entity {claim_data.entity_id} not found"
        )

    claim = Claim.model_validate(claim_data)
    created = db.create_claim(claim)
    return created


@app.get("/claims", response_model=List[ClaimRead])
def list_claims(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    List all claims with pagination.

    Args:
        limit: Maximum number of results (max 1000)
        offset: Number of results to skip

    Returns:
        List of claims
    """
    claims = db.list_claims(limit=limit, offset=offset)
    return claims


# Decision endpoints


@app.post("/decisions", response_model=DecisionRead, status_code=201)
def create_decision(decision_data: DecisionBase):
    """
    Create a new decision record.

    Args:
        decision_data: Decision information (title, context, options, decision, etc.)

    Returns:
        Created decision with ID and timestamp
    """
    decision = Decision.model_validate(decision_data)
    created = db.create_decision(decision)
    return created


@app.get("/decisions", response_model=List[DecisionRead])
def list_decisions(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    List all decisions with pagination.

    Args:
        limit: Maximum number of results (max 1000)
        offset: Number of results to skip

    Returns:
        List of decisions
    """
    decisions = db.list_decisions(limit=limit, offset=offset)
    return decisions


@app.get("/decisions/{decision_id}", response_model=DecisionRead)
def get_decision(decision_id: int):
    """
    Get decision by ID.

    Args:
        decision_id: Decision ID

    Returns:
        Decision details

    Raises:
        HTTPException: 404 if decision not found
    """
    decision = db.get_decision(decision_id)
    if decision is None:
        raise HTTPException(
            status_code=404, detail=f"Decision {decision_id} not found"
        )
    return decision


# Source endpoints


@app.post("/sources", response_model=SourceRead, status_code=201)
def create_source(source_data: SourceBase):
    """
    Create a new source.

    Args:
        source_data: Source information (uri_or_hash, origin, sensitivity, legal_basis)

    Returns:
        Created source with ID and timestamp
    """
    source = Source.model_validate(source_data)
    created = db.create_source(source)
    return created


@app.get("/sources", response_model=List[SourceRead])
def list_sources(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    List all sources with pagination.

    Args:
        limit: Maximum number of results (max 1000)
        offset: Number of results to skip

    Returns:
        List of sources
    """
    sources = db.list_sources(limit=limit, offset=offset)
    return sources


# Entity context endpoint


@app.get("/entities/{entity_id}/context")
def get_entity_context(entity_id: int):
    """
    Get complete context for an entity: all claims and related decisions.

    This endpoint fetches:
    - Entity details
    - All claims about the entity
    - All decisions that reference those claims

    Args:
        entity_id: Entity ID

    Returns:
        Context object with entity, claims, and decisions

    Raises:
        HTTPException: 404 if entity not found
    """
    # Get entity
    entity = db.get_entity(entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

    # Get all claims for this entity
    claims = db.get_claims_by_entity(entity_id)

    # Get claim IDs
    claim_ids = {claim.id for claim in claims}

    # Get all decisions that reference any of these claims
    all_decisions = db.list_decisions(limit=1000)
    related_decisions = []

    for decision in all_decisions:
        # Parse related_claim_ids (stored as JSON string)
        try:
            decision_claim_ids = json.loads(decision.related_claim_ids)
            if any(cid in claim_ids for cid in decision_claim_ids):
                related_decisions.append(decision)
        except (json.JSONDecodeError, TypeError):
            continue

    return {
        "entity": entity,
        "claims": claims,
        "decisions": related_decisions,
    }
