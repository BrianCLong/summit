#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
git ls-files | grep -E '(^|/)(\.gitlab-ci\.yml|bitbucket-pipelines\.yml|\.circleci/config\.yml|azure-pipelines\.yml|Jenkinsfile|\.drone\.yml|\.buildkite/pipeline\.yml)$' \
  | tee artifacts/scm.ci.files.txt || true

