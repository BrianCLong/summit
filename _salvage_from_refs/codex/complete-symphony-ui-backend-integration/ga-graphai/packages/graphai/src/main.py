from typing import List, Tuple

from fastapi import FastAPI
from pydantic import BaseModel

from features import build_degree_features


class FeatureBuildRequest(BaseModel):
    edges: List[Tuple[str, str]]


class Feature(BaseModel):
    node: str
    degree: int


class FeatureBuildResponse(BaseModel):
    features: List[Feature]


app = FastAPI()


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/feature/build', response_model=FeatureBuildResponse)
def feature_build(req: FeatureBuildRequest) -> FeatureBuildResponse:
    data = build_degree_features(req.edges)
    features = [Feature(node=n, degree=d) for n, d in data.items()]
    return FeatureBuildResponse(features=features)
