#!/usr/bin/env bash
set -euo pipefail

IMAGE="aiweiliu/wedlm:v3"
CONTAINER_NAME="wedlm-demo"
MOUNT_PATH="$(pwd)/docs/labs/wedlm"
PORT="7860"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run this script." >&2
  exit 1
fi

echo "[WeDLM] Ensuring image ${IMAGE} is available..."
docker pull "${IMAGE}"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[WeDLM] Container ${CONTAINER_NAME} already exists. Starting and attaching..."
  docker start "${CONTAINER_NAME}" >/dev/null
  docker attach "${CONTAINER_NAME}"
  exit 0
fi

echo "[WeDLM] Starting container ${CONTAINER_NAME} with GPU support..."
docker run -it --gpus all \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:${PORT}" \
  -v "${MOUNT_PATH}:/workspace/lab" \
  "${IMAGE}" /bin/bash <<INNER
set -euo pipefail

echo "[WeDLM] Container ready. Use the following commands in another terminal if needed:"
echo "  docker exec -it ${CONTAINER_NAME} python example.py --model tencent/WeDLM-8B-Instruct --prompt 'Hello from Summit'"
echo "  docker exec -it ${CONTAINER_NAME} python web_demo.py --model tencent/WeDLM-8B-Instruct --host 0.0.0.0 --port ${PORT}"

echo "[WeDLM] To run the smoke prompts inside the container:"
echo "  while read -r line; do python example.py --model tencent/WeDLM-8B-Instruct --prompt \"\$line\"; done < /workspace/lab/smoke_prompts.txt"

/bin/bash
INNER
