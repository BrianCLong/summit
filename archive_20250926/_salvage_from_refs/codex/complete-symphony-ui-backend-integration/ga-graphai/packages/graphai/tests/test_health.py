import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import app

client = TestClient(app)

def test_health():
    assert client.get('/health').json()['status'] == 'ok'
