from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.worker import worker

app = FastAPI(title="ML Training Service")

class TrainingJobRequest(BaseModel):
    model_name: str
    params: Dict[str, Any] = {}
    callback_url: Optional[str] = None

@app.post("/train")
async def trigger_training(job: TrainingJobRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(worker.train_model, job.dict())
    return {"status": "accepted", "message": f"Training started for {job.model_name}"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
