#!/bin/bash
# Revert to rootless opa
sed -i 's/openpolicyagent\/opa:0.69.0-rootless/openpolicyagent\/opa:latest-rootless/g' ops/docker-compose.yml
sed -i 's/openpolicyagent\/opa:0.69.0-rootless/openpolicyagent\/opa:latest-rootless/g' ops/docker-compose.ci.yml
