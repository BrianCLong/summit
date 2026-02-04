# summit/agents/sentries/freshness.py
import time

def check_freshness(data_source, max_age_seconds):
    """
    Checks if the data source is fresh.
    """
    last_updated = data_source.get_last_updated()
    age = time.time() - last_updated
    return {
        "is_fresh": age <= max_age_seconds,
        "age_seconds": age
    }
