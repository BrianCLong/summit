import json
from datetime import datetime


def main():
    try:
        with open('pr-open.json') as f:
            prs = json.load(f)
    except:
        print("Error reading pr-open.json")
        return

    # Sort by updatedAt descending
    prs.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)

    print(f"Total PRs: {len(prs)}")
    print("Top 5 most recent PRs:")
    for pr in prs[:5]:
        print(f"#{pr['number']} {pr['updatedAt']} {pr['title']}")

    # Check for 'fix'
    print("\nRecent fixes:")
    for pr in prs:
        if 'fix' in pr['title'].lower():
             print(f"#{pr['number']} {pr['updatedAt']} {pr['title']}")

if __name__ == "__main__":
    main()
