import os
import json
import requests

def get_ready_to_merge_prs():
    """
    Fetches pull requests from the GitHub GraphQL API and filters them based on the following criteria:
    - Authored by a configurable list of bot authors
    - Has a passing CI status
    - Has at least one approval

    Returns a JSON array of PR numbers that are ready to be merged.
    """
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN environment variable not set")

    repo_slug = os.environ.get("GITHUB_REPOSITORY")
    if not repo_slug:
        raise ValueError("GITHUB_REPOSITORY environment variable not set")
    owner, repo = repo_slug.split('/')

    bot_authors_str = os.environ.get("BOT_AUTHORS", "dependabot[bot],renovate[bot]")
    bot_authors = [author.strip() for author in bot_authors_str.split(',')]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    query = """
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: OPEN, after: $cursor) {
          nodes {
            number
            author {
              login
            }
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup {
                    state
                  }
                }
              }
            }
            reviews(first: 10, states: APPROVED) {
              totalCount
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
    """

    all_prs = []
    has_next_page = True
    cursor = None

    while has_next_page:
        variables = {
            "owner": owner,
            "repo": repo,
            "cursor": cursor
        }

        response = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={"query": query, "variables": variables}
        )
        response.raise_for_status()
        data = response.json()

        if "errors" in data:
            raise Exception(f"GraphQL query failed: {data['errors']}")

        pr_data = data.get("data", {}).get("repository", {}).get("pullRequests", {})
        all_prs.extend(pr_data.get("nodes", []))

        page_info = pr_data.get("pageInfo", {})
        has_next_page = page_info.get("hasNextPage", False)
        cursor = page_info.get("endCursor")

    ready_to_merge_pr_numbers = []

    for pr in all_prs:
        author = pr.get("author", {}).get("login")
        if author not in bot_authors:
            continue

        commits = pr.get("commits", {}).get("nodes", [])
        if not commits:
            continue

        commit_status = commits[0].get("commit", {}).get("statusCheckRollup", {}).get("state")
        if commit_status != "SUCCESS":
            continue

        reviews = pr.get("reviews", {})
        if reviews and reviews.get("totalCount", 0) > 0:
            ready_to_merge_pr_numbers.append(pr["number"])

    return json.dumps(ready_to_merge_pr_numbers)


if __name__ == "__main__":
    ready_prs = get_ready_to_merge_prs()
    print(ready_prs)
