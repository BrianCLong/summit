# Required Checks Discovery

* UI steps: repo settings → branches → required status checks
* API steps: GitHub `GET /repos/{owner}/{repo}/branches/{branch}` + protections
* Temporary check naming convention: `ci/evidence-verify`, `ci/policy-fixtures`, etc.
* Rename plan PR: map temporary → canonical once discovered
