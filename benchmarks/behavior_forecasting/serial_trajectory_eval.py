class SerialTrajectoryForecaster:
    def __init__(self):
        self.specialization_entropy = 0.5
        pass

    def predict(self, context, horizon=1):
        # mock prediction logic for baseline tests
        predictions = []
        for _ in range(horizon):
            predictions.append({
                "event_id": f"pred_{len(context)}",
                "ts_offset_ms": context[-1]["ts_offset_ms"] + 100,
                "actor": "agent",
                "event_type": "tool_call",
                "payload": {"tool": "default_action"}
            })
        return predictions

def scoreForecast(forecast, target):
    # Returns some distance / divergence metric. 0 = perfect.
    return {"divergence": 0.0, "calibration_error": 0.02}

def evaluate_trajectory(events, minContext=1, horizon=3):
    forecaster = SerialTrajectoryForecaster()
    results = []

    for t in range(minContext, len(events)):
        context = events[:t]
        target = events[t:min(t + horizon, len(events))]

        forecast = forecaster.predict(context, horizon=len(target))
        score = scoreForecast(forecast, target)
        results.append(score)

    return results
