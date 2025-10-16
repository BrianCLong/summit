# v24_modules/activity_replay_engine.py
# Simulates and audits historical activity sequences


class ActivityReplayEngine:
    def __init__(self):
        self.history = []

    def replay_activity(self, activity_data: dict) -> bool:
        """Simulates replaying a single activity and adds it to history."""
        print(f"Replaying activity: {activity_data.get('id', 'unknown')}")
        self.history.append(activity_data)
        return True

    def get_history(self) -> list:
        """Returns the history of replayed activities."""
        return self.history
