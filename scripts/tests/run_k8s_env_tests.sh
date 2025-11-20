#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <environment> <service>" >&2
  exit 1
fi

environment=$1
service=$2
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
configmap_name="env-test-scripts"
job_name="${service}-${environment}-synthetic-tests"

if [[ "${service}" != "node" && "${service}" != "python" ]]; then
  echo "Unsupported service '${service}'. Expected 'node' or 'python'." >&2
  exit 1
fi

printf 'Preparing Kubernetes job for %s synthetic checks in %s...\n' "${service}" "${environment}"

kubectl create configmap "${configmap_name}" \
  --from-file="${repo_root}/scripts/tests/run_node_tests.mjs" \
  --from-file="${repo_root}/scripts/tests/run_python_tests.py" \
  --from-file="${repo_root}/scripts/tests/data/synthetic-test-data.json" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl delete job "${job_name}" --ignore-not-found >/dev/null 2>&1

if [[ "${service}" == "node" ]]; then
  image="node:20-alpine"
  container_command="node /workspace/run_node_tests.mjs"
elif [[ "${service}" == "python" ]]; then
  image="python:3.11-slim"
  container_command="python /workspace/run_python_tests.py"
fi

cat <<MANIFEST | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: ${job_name}
  labels:
    app: environment-tests
    environment: ${environment}
    service: ${service}
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: environment-tests
        environment: ${environment}
        service: ${service}
    spec:
      restartPolicy: Never
      containers:
        - name: ${service}-synthetic-tests
          image: ${image}
          command:
            - /bin/sh
            - -c
            - "${container_command}"
          env:
            - name: TEST_ENVIRONMENT
              value: "${environment}"
            - name: SYNTHETIC_DATA_PATH
              value: /workspace/synthetic-test-data.json
          volumeMounts:
            - name: test-scripts
              mountPath: /workspace
      volumes:
        - name: test-scripts
          configMap:
            name: ${configmap_name}
            defaultMode: 0555
MANIFEST

kubectl wait --for=condition=complete "job/${job_name}" --timeout=180s
kubectl logs "job/${job_name}"
kubectl delete job "${job_name}" >/dev/null 2>&1
