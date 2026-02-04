#!/bin/bash
set -e

echo "Running H1 Canary Automation Proof (Simulated)..."

mkdir -p mocks
export PATH="$PWD/mocks:$PATH"

# Create call log
export KUBECTL_LOG="$PWD/mocks/kubectl.log"
rm -f "$KUBECTL_LOG"

cat > mocks/kubectl << 'KUBECTL_EOF'
#!/bin/bash
# Consume stdin to avoid SIGPIPE
if [ ! -t 0 ]; then cat > /dev/null; fi

ARGS="$*"
echo "$ARGS" >> "$KUBECTL_LOG"

if echo "$ARGS" | grep -q "jsonpath"; then echo "3"; exit 0; fi

if [[ "$ARGS" == *"get deployment intelgraph-canary"* ]]; then exit 1; fi
if [[ "$ARGS" == *"get namespace"* ]]; then echo "intelgraph-prod"; exit 0; fi
if [[ "$ARGS" == *"get deployment intelgraph"* ]]; then echo "intelgraph deployment"; exit 0; fi
if [[ "$ARGS" == *"rollout status"* ]]; then exit 0; fi
if [[ "$ARGS" == *"apply -f"* ]]; then exit 0; fi
if [[ "$ARGS" == *"patch"* ]]; then exit 0; fi
if [[ "$ARGS" == *"set image"* ]]; then exit 0; fi
if [[ "$ARGS" == *"delete deployment"* ]]; then exit 0; fi
if [[ "$ARGS" == *"create event"* ]]; then exit 0; fi
if [[ "$ARGS" == *"get crd"* ]]; then exit 1; fi

exit 0
KUBECTL_EOF
chmod +x mocks/kubectl

cat > mocks/helm << 'HELM_EOF'
#!/bin/bash
exit 0
HELM_EOF
chmod +x mocks/helm

cat > mocks/docker << 'DOCKER_EOF'
#!/bin/bash
if [[ "$*" == *"manifest inspect"* ]]; then echo "Digest: sha256:12345"; exit 0; fi
DOCKER_EOF
chmod +x mocks/docker

cat > mocks/curl << 'CURL_EOF'
#!/bin/bash
if [[ "$*" == *"histogram_quantile"* ]] && [ "$SCENARIO" == "failure" ]; then
   echo '{"data":{"result":[{"value":[1234567890,"500"]}]}}'
elif [[ "$*" == *"status=~\"5..\""* ]] && [ "$SCENARIO" == "failure" ]; then
   echo '{"data":{"result":[{"value":[1234567890,"0.05"]}]}}'
elif [[ "$*" == *"pod_status_ready"* ]]; then
   echo '{"data":{"result":[{"value":[1234567890,"1"]}]}}'
else
   if [[ "$*" == *"histogram_quantile"* ]]; then
      echo '{"data":{"result":[{"value":[1234567890,"0.1"]}]}}'
   else
      echo '{"data":{"result":[{"value":[1234567890,"0"]}]}}'
   fi
fi
CURL_EOF
chmod +x mocks/curl

export SCENARIO="success"
export MONITORING_DURATION=2
export SLO_EVALUATION_WINDOW=5
export GITHUB_REPOSITORY="companyos/repo"

echo "--- Running SCENARIO: SUCCESS ---"
rm -f "$KUBECTL_LOG"
./scripts/production-canary.sh

if grep -q "delete deployment intelgraph-canary" "$KUBECTL_LOG"; then
    echo "✅ Canary removed (Success path)."
else
    echo "❌ Canary NOT removed (Success path failed)."
    exit 1
fi

echo "--- Running SCENARIO: FAILURE ---"
export SCENARIO="failure"
rm -f "$KUBECTL_LOG"

if ./scripts/production-canary.sh; then
    echo "❌ Expected failure but succeeded!"
    exit 1
else
    echo "✅ Canary failed (Expected)."
    # Assert side effect: Rollback actions
    if grep -q "delete deployment intelgraph-canary" "$KUBECTL_LOG"; then
        echo "✅ Rollback triggered (Cleanup called)."
    else
        echo "❌ Rollback logic NOT triggered!"
        exit 1
    fi
fi

echo "H1 Proof Complete."
