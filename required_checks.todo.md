# Required checks discovery (TODO)
1) Open the repo settings → Branch protection → note required status checks.
2) In CI provider UI, list workflow/job names that must pass on main.
3) Map temporary gates to real check names:
   - gate:evidence-index
   - gate:deny-by-default-fixtures

## Rename plan
Once names are known, add PR7 to rename gates + update docs + keep aliases for 1 release.
