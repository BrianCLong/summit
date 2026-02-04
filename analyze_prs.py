import json
import re


def main():
    try:
        with open('pr-open.json') as f:
            prs = json.load(f)
    except Exception as e:
        print(f"Error reading pr-open.json: {e}")
        return

    keywords = [
        "GA", "cloud", "readiness", "infra", "diff",
        "compliance", "evidence", "failure mode",
        "simulation", "prod", "guard", "runtime",
        "lockfile", "drift", "security", "pipeline"
    ]

    relevant_prs = []
    for pr in prs:
        title = pr.get('title', '')
        number = pr.get('number')
        labels = [l.get('name') for l in pr.get('labels', [])]

        score = 0
        matched_keywords = []
        for kw in keywords:
            if re.search(r'\b' + kw + r'\b', title, re.IGNORECASE):
                score += 1
                matched_keywords.append(kw)

        if score > 0:
            relevant_prs.append({
                'number': number,
                'title': title,
                'keywords': matched_keywords,
                'author': pr.get('author', {}).get('login'),
                'updatedAt': pr.get('updatedAt')
            })

    print(f"Found {len(relevant_prs)} relevant PRs out of {len(prs)} total.")
    print("Top 20 relevant PRs:")
    for pr in relevant_prs[:20]:
        print(f"PR #{pr['number']}: {pr['title']} (Keywords: {', '.join(pr['keywords'])})")

if __name__ == "__main__":
    main()
