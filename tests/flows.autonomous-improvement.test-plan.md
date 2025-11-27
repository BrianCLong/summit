# Autonomous Improvement Flow – Test Plan

## Test 1 – Deficit Detection

Given: a repo with explicit TODOs and weak tests  
When: `auto_improve_daily` flow runs  
Then:
- deficits are detected
- at least one high-value fix is proposed

## Test 2 – PR Output

Given: detected deficits  
When: Jules runs under the flow  
Then:
- code, tests, docs, and PR metadata are produced for at least one fix.
