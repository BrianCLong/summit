from typing import Any

from app.worker import worker
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

app = FastAPI(title="ML Training Service")


class TrainingJobRequest(BaseModel):
    model_name: str
    params: dict[str, Any] = {}
    callback_url: str | None = None


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
