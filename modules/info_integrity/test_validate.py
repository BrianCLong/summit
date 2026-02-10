import pytest
from datetime import datetime, timezone
from modules.info_integrity.timestamps import get_current_utc_timestamp

def test_get_current_utc_timestamp():
    dt = get_current_utc_timestamp()
    assert dt.tzinfo == timezone.utc
    assert isinstance(dt, datetime)
