import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import ping

def test_ping():
    assert ping() == 'pong'
