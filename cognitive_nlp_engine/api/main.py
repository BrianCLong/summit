"""FastAPI Application for Cognitive NLP Engine."""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import uuid
import logging

from ..nlu.query_parser import query_parser, ParsedQuery
from ..dialogue.manager import dialogue_manager, DialogueContext, DialogueTurn
from ..knowledge_graph.interface import knowledge_graph, GraphQuery, GraphResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Cognitive NLP Engine",
    description="Natural Language Interface for Security Analysis",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class ParseQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None

class ParseQueryResponse(BaseModel):
    conversation_id: str
    turn_id: str
    original_query: str
    parsed_query: Dict[str, Any]
    system_response: str
    confidence: float
    execution_time: float

class DialogueHistoryResponse(BaseModel):
    conversation_id: str
    user_id: str
    created_at: str
    last_updated: str
    current_topic: str
    entities: Dict[str, List[str]]
    conversation_history: List[Dict[str, Any]]

class GraphQueryRequest(BaseModel):
    cypher: str
    parameters: Dict[str, Any] = {}
    description: str
    expected_return: List[str] = []

class GraphQueryResponse(BaseModel):
    query: Dict[str, Any]
    data: List[Dict[str, Any]]
    execution_time: float
    row_count: int

@app.post("/parse", response_model=ParseQueryResponse)
async def parse_query(request: ParseQueryRequest):
    """Parse a natural language query and maintain dialogue context."""
    import time
    start_time = time.time()
    
    try:
        # Parse the query
        parsed = query_parser.parse_query(request.query)
        
        # Manage dialogue context
        if request.conversation_id:
            conversation_id = request.conversation_id
        else:
            conversation_id = dialogue_manager.start_dialogue(
                request.user_id or str(uuid.uuid4())
            )
        
        # Process dialogue turn
        turn = dialogue_manager.process_turn(
            conversation_id, 
            request.query, 
            parsed.__dict__
        )
        
        # Generate simple system response based on intent
        system_response = generate_system_response(parsed.intent, parsed.entities)
        turn.system_response = system_response
        
        execution_time = time.time() - start_time
        
        return ParseQueryResponse(
            conversation_id=conversation_id,
            turn_id=turn.turn_id,
            original_query=request.query,
            parsed_query=parsed.__dict__,
            system_response=system_response,
            confidence=parsed.confidence,
            execution_time=execution_time
        )
        
    except Exception as e:
        logger.error("Error parsing query: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error parsing query: {str(e)}")

@app.get("/dialogue/{conversation_id}", response_model=DialogueHistoryResponse)
async def get_dialogue_history(conversation_id: str):
    """Retrieve dialogue history and context."""
    try:
        context = dialogue_manager.get_context(conversation_id)
        if not context:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return DialogueHistoryResponse(
            conversation_id=context.conversation_id,
            user_id=context.user_id,
            created_at=context.created_at,
            last_updated=context.last_updated,
            current_topic=context.current_topic,
            entities=context.entities,
            conversation_history=[
                {
                    "turn_id": turn.turn_id,
                    "user_input": turn.user_input,
                    "system_response": turn.system_response,
                    "timestamp": turn.timestamp,
                    "confidence": turn.confidence
                }
                for turn in context.conversation_history
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving dialogue history: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving dialogue history: {str(e)}")

@app.post("/graph/query", response_model=GraphQueryResponse)
async def query_knowledge_graph(request: GraphQueryRequest):
    """Execute a query against the knowledge graph."""
    try:
        graph_query = GraphQuery(
            cypher=request.cypher,
            parameters=request.parameters,
            description=request.description,
            expected_return=request.expected_return
        )
        
        result = knowledge_graph.query_graph(graph_query)
        
        return GraphQueryResponse(
            query={
                "cypher": result.query.cypher,
                "parameters": result.query.parameters,
                "description": result.query.description
            },
            data=result.data,
            execution_time=result.execution_time,
            row_count=result.row_count
        )
    except Exception as e:
        logger.error("Error executing graph query: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error executing graph query: {str(e)}")

@app.get("/dialogue/list/{user_id}")
async def list_user_conversations(user_id: str):
    """List all active conversations for a user."""
    try:
        conversations = dialogue_manager.get_active_conversations(user_id)
        return {"conversations": conversations}
    except Exception as e:
        logger.error("Error listing conversations: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error listing conversations: {str(e)}")

@app.delete("/dialogue/{conversation_id}")
async def end_conversation(conversation_id: str):
    """End a conversation and clean up resources."""
    try:
        context = dialogue_manager.end_dialogue(conversation_id)
        if context:
            return {"message": "Conversation ended successfully", "conversation_id": conversation_id}
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error ending conversation: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error ending conversation: {str(e)}")

def generate_system_response(intent: str, entities: Dict[str, List[str]]) -> str:
    """Generate a simple system response based on parsed intent and entities."""
    intent_responses = {
        'find_threats': "I'm searching for threats related to your query.",
        'analyze_behavior': "I'll analyze the behavioral patterns you mentioned.",
        'predict_risk': "I'm assessing the risk factors in your query.",
        'explain_incident': "Let me explain the incident details for you.",
        'compare_scenarios': "I'll compare the scenarios as requested.",
        'generate_hypothesis': "I'm generating hypotheses based on your query.",
        'validate_evidence': "I'm validating the evidence you mentioned.",
        'simulate_scenario': "I'll run a simulation of the scenario you described."
    }
    
    base_response = intent_responses.get(intent, "I understand your query.")
    
    # Add entity-specific information if available
    if entities:
        entity_info = []
        for entity_type, values in entities.items():
            if values:
                entity_info.append(f"{entity_type}: {', '.join(values[:3])}")  # Limit to 3 values
        
        if entity_info:
            return f"{base_response} I found these entities: {', '.join(entity_info)}."
    
    return base_response

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "cognitive-nlp-engine"}

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "message": "Cognitive NLP Engine API",
        "version": "1.0.0",
        "endpoints": [
            "POST /parse - Parse natural language queries",
            "GET /dialogue/{conversation_id} - Get dialogue history",
            "POST /graph/query - Execute knowledge graph queries",
            "GET /dialogue/list/{user_id} - List user conversations",
            "DELETE /dialogue/{conversation_id} - End conversation"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)