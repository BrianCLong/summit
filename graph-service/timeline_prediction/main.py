import uvicorn
from fastapi import FastAPI, Query
from timeline_model import predict_timeline

app = FastAPI()


@app.get("/predict")
async def predict(days: int = Query(7, description="Forecast horizon")):
    result = await predict_timeline(days)
    return result


if __name__ == "__main__":
    uvicorn.run("main:app", port=8081, reload=True)
