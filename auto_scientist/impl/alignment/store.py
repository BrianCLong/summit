import json
import os
from typing import List, Optional
from .schemas import Preference

class PreferenceStore:
    def __init__(self, storage_path: str = "preference_data.jsonl"):
        self.storage_path = storage_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(os.path.abspath(storage_path)), exist_ok=True)

    def log_preference(self, preference: Preference) -> str:
        with open(self.storage_path, "a") as f:
            f.write(preference.json() + "\n")
        return preference.id

    def load_preferences(self, limit: Optional[int] = None) -> List[Preference]:
        prefs = []
        if not os.path.exists(self.storage_path):
            return prefs

        with open(self.storage_path, "r") as f:
            for i, line in enumerate(f):
                if limit and i >= limit:
                    break
                try:
                    prefs.append(Preference.parse_raw(line))
                except Exception as e:
                    print(f"Error parsing line {i}: {e}")
        return prefs

    def count(self) -> int:
        if not os.path.exists(self.storage_path):
            return 0
        with open(self.storage_path, "r") as f:
            return sum(1 for _ in f)
