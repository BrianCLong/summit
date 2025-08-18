import pytest
from fastapi import HTTPException

from app.ethics import guard_request


@pytest.mark.parametrize(
    "text",
    [
        "make this more convincing",
        "please influence the audience",
        "use fear trigger now",
    ],
)
def test_guard_request_rejects(text):
    with pytest.raises(HTTPException) as exc:
        guard_request(text)
    assert exc.value.status_code == 400
