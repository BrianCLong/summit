package compliance
import future.keywords

pass["chg-DEPLOY-001"]["Prod deploy has CI run, commit, artifact digest"] {
  input.evidence.spec == "summit.evidence.deployment.v1"
  input.evidence.deployment.env == "prod"
  input.evidence.deployment.commit_sha != ""
  input.evidence.deployment.ci_run_id != ""
  input.evidence.deployment.artifact_digest != ""
}

fail["chg-DEPLOY-001"]["Prod deploy missing traceability fields"] {
  input.evidence.spec == "summit.evidence.deployment.v1"
  input.evidence.deployment.env == "prod"
  input.evidence.deployment.commit_sha == ""
}

fail["chg-DEPLOY-001"]["Prod deploy missing traceability fields"] {
  input.evidence.spec == "summit.evidence.deployment.v1"
  input.evidence.deployment.env == "prod"
  input.evidence.deployment.ci_run_id == ""
}

fail["chg-DEPLOY-001"]["Prod deploy missing traceability fields"] {
  input.evidence.spec == "summit.evidence.deployment.v1"
  input.evidence.deployment.env == "prod"
  input.evidence.deployment.artifact_digest == ""
}
