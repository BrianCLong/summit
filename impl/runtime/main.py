from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .core import OrchestrationCore

app = FastAPI(title="Frontier Runtime", version="0.1.0")
orchestrator = OrchestrationCore()

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    tools: Optional[List[Dict[str, Any]]] = None
    tenant: Optional[str] = "default"

@app.post("/v1/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        response = await orchestrator.execute_request({
            "endpoint": "chat",
            "messages": request.messages,
            "tools": request.tools,
            "tenant": request.tenant
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
