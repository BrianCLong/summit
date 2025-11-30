package policies.allowedregistries

test_allow_ghcr {
  allow with input as {"review": {"object": {"spec": {"template": {"spec": {"containers": [{"image": "ghcr.io/BrianCLong/summit:sha"}]}}}}}}
}

test_deny_dockerhub_neg {
  not allow with input as {"review": {"object": {"spec": {"template": {"spec": {"containers": [{"image": "docker.io/library/nginx:latest"}]}}}}}}
}
