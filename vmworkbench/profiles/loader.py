import os
import tomllib
from typing import Any


class ProfileLoader:
    """
    Loads OS profiles from builtin and user directories.
    """
    def __init__(self, builtin_dir: str | None = None, user_dir: str | None = None):
        self.builtin_dir = builtin_dir or os.path.join(os.path.dirname(__file__), "builtin")
        self.user_dir = user_dir or os.path.expanduser("~/.config/summit/profiles")
        self.profiles: dict[str, Any] = {}

    def load_all(self):
        """Loads all profiles found in the search paths."""
        for d in [self.builtin_dir, self.user_dir]:
            if not os.path.exists(d):
                continue
            for f in os.listdir(d):
                if f.endswith(".toml"):
                    path = os.path.join(d, f)
                    with open(path, "rb") as fh:
                        try:
                            data = tomllib.load(fh)
                            name = data.get("name")
                            if name:
                                self.profiles[name] = data
                        except Exception as e:
                            print(f"Failed to load profile {path}: {e}")

    def get_profile(self, name: str) -> dict[str, Any]:
        return self.profiles.get(name)

    def list_profiles(self) -> list[str]:
        return list(self.profiles.keys())
