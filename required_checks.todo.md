# Required Checks Todo

## Discovery Steps

1. **Check GitHub Branch Protection**
   - Go to Repo Settings -> Branches -> Rulesets/Protection.
   - List required status checks.

2. **List Required Checks via API**
   - Use `gh api repos/:owner/:repo/branches/main/protection/required_status_checks`

## Planned Gates

1. **Passive Context Budget**
   - Name: `test-agents-md-budget`
   - Command: `pytest summit/agent/context/tests/test_agents_md_budget.py`

2. **Sanitizer Check**
   - Name: `test-agents-md-sanitizer`
   - Command: `pytest summit/agent/context/tests/test_agents_md_sanitizer.py`

3. **Skill Reliability Gate**
   - Name: `eval-skill-reliability`
   - Command: `python3 summit/evals/context_reliability/agentsmd_vs_skills/run.py`
