# predictive_threat_suite/timeline_forecast.py

from datetime import datetime, timedelta
from typing import Any


def get_timeline_forecast(
    entity_id: str, start_date_str: str, end_date_str: str
) -> list[dict[str, Any]]:
    """
    Generates a simulated timeline forecast for a given entity based on a simple linear trend.
    """
    print(f"Generating timeline forecast for {entity_id} from {start_date_str} to {end_date_str}")

    forecast_data = []
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d")

    current_date = start_date
    initial_value = 10.0  # Starting point for the trend
    trend_slope = 0.5  # How much the value increases per day

    while current_date <= end_date:
        value = initial_value + (current_date - start_date).days * trend_slope
        forecast_data.append(
            {
                "date": current_date.strftime("%Y-%m-%d"),
                "value": round(value, 2),  # Round to 2 decimal places
            }
        )
        current_date += timedelta(days=1)

    return forecast_data


def enable_timeline_forecast_feature(enable: bool) -> bool:
    """
    Stub for enabling/disabling the timeline forecast feature via a feature flag.
    """
    print(f"Setting timeline forecast feature flag to {enable}")
    return enable
