import datetime as dt
import json
import subprocess


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    return run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()


MILESTONES_ORDER = [
    "MVP1-Core-Graph",
    "MVP1-Copilot",
    "MVP1-Federation",
    "MVP1-Simulation",
    "MVP1-Collaboration",
    "MVP1-Predictive-AI",
]


def next_fridays(n, start=None):
    today = start or dt.date.today()
    # find this week's Friday
    days_ahead = (4 - today.weekday()) % 7  # 0=Monday; 4=Friday
    first = today + dt.timedelta(days=days_ahead)
    # if today is Friday already, schedule next Friday
    if first == today:
        first = today + dt.timedelta(days=7)
    fridays = [first + dt.timedelta(weeks=i) for i in range(n)]
    return fridays


def milestones(slug):
    out = run(["gh", "api", f"/repos/{slug}/milestones?state=all"]).stdout
    return json.loads(out) if out.strip() else []


def set_due(slug, number, date_: dt.date):
    due_on = (
        dt.datetime(date_.year, date_.month, date_.day, 23, 59, 59, tzinfo=dt.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    run(
        [
            "gh",
            "api",
            "--method",
            "PATCH",
            f"/repos/{slug}/milestones/{number}",
            "-f",
            f"due_on={due_on}",
        ]
    )


def main():
    run(["gh", "auth", "status"])  # ensure auth
    slug = repo_slug()
    existing = milestones(slug)
    title_to_num = {m["title"]: m["number"] for m in existing}
    fridays = next_fridays(len(MILESTONES_ORDER))
    for title, date_ in zip(MILESTONES_ORDER, fridays, strict=False):
        num = title_to_num.get(title)
        if not num:
            print(f"Skip missing milestone: {title}")
            continue
        print(f"Setting due date for {title} → {date_.isoformat()}")
        set_due(slug, num, date_)
    print("Milestone due dates updated.")


if __name__ == "__main__":
    main()
