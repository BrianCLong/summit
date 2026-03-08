#!/bin/bash
git show HEAD:.github/workflows/docs-lint.yml > old_docs.yml
cat .github/workflows/docs-lint.yml > new_docs.yml
diff old_docs.yml new_docs.yml
