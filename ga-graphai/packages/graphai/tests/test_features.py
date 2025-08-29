import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import app

client = TestClient(app)


def test_feature_build_degree():
    edges = [["a", "b"], ["b", "c"], ["c", "a"]]
    resp = client.post('/feature/build', json={'edges': edges})
    data = resp.json()
    assert {'node': 'a', 'degree': 2} in data['features']
    assert {'node': 'b', 'degree': 2} in data['features']
    assert {'node': 'c', 'degree': 2} in data['features']
