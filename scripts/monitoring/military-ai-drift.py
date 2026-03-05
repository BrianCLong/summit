import json
import os


def run():
    trends = {
        "4_week_rolling_mean": 0.5,
        "alert": False
    }

    out_dir = os.path.join("reports", "military_use")
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, "trends.json"), "w") as f:
        json.dump(trends, f, indent=2)

if __name__ == "__main__":
    run()
