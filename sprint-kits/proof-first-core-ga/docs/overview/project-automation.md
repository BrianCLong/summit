# GitHub Project Automation

```bash
# Create project and capture ID
PROJECT_ID=$(gh project create --title "Proof-First Core GA" --format json | jq -r .id)

# Add issues to the project after running the seeder
num=$(gh issue list --search "A-1" --json number --jq '.[0].number')
gh project item-add "$PROJECT_ID" --url "$(gh issue view "$num" --json url --jq .url)"
```

Configure project views with Status (Backlog → Ready → In Progress → In Review → QA/Acceptance → Done), Owner, Story Points, and Epic fields for sprint tracking.
