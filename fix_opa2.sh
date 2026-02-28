#!/bin/bash
sed -i 's/openpolicyagent\/opa:0.69.0-rootless/openpolicyagent\/opa:latest/g' ops/docker-compose.yml
sed -i 's/openpolicyagent\/opa:0.69.0-rootless/openpolicyagent\/opa:latest/g' ops/docker-compose.ci.yml
