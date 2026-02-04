#!/bin/bash

# Mock script to list image digests
# In a real scenario, this would inspect the running k8s cluster or ECS task definitions

cat <<EOF
{
  "api": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "worker": "sha256:d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
  "frontend": "sha256:4e3226759c31d931327e57d15900693245452366887415492873998122394567"
}
EOF
