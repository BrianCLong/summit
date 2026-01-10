# WeDLM Local Demo Harness

This lab shows how to run the official WeDLM Docker image locally for quick validation. It uses the published image `aiweiliu/wedlm:v3`, which bundles the optimized diffusion decoding engine and example scripts.

## Prerequisites

- Linux host with an NVIDIA GPU
- NVIDIA Container Toolkit installed (required for GPU passthrough)
- Docker Engine 24+ (compose not required)
- Sufficient GPU memory (WeDLM-8B-Instruct expects a data center GPU such as A100/L40)

## Steps

1. **Pull the image**

   ```bash
   docker pull aiweiliu/wedlm:v3
   ```

2. **Start the container with GPU access**

   ```bash
   # Names the container for easy exec; mounts a writable home for artifacts
   docker run -it --gpus all \
     --name wedlm-demo \
     -v "$PWD/docs/labs/wedlm:/workspace/lab" \
     aiweiliu/wedlm:v3 /bin/bash
   ```

   The container drops you into a bash shell. If it exits, you can reattach with `docker start -ai wedlm-demo`.

3. **Run the CLI example (inside the container)**

   ```bash
   python example.py --model tencent/WeDLM-8B-Instruct --prompt "Hello from Summit"
   ```

   For reproducible checks, you can feed the provided smoke prompts:

   ```bash
   while read -r line; do
     python example.py --model tencent/WeDLM-8B-Instruct --prompt "$line"
   done < /workspace/lab/smoke_prompts.txt
   ```

4. **Run the web demo (inside the container)**

   ```bash
   python web_demo.py --model tencent/WeDLM-8B-Instruct --host 0.0.0.0 --port 7860
   ```

   Then browse to <http://localhost:7860>. Port 7860 is exposed automatically when the container is started with `-p`:

   ```bash
   docker run -it --gpus all \
     --name wedlm-demo \
     -p 7860:7860 \
     -v "$PWD/docs/labs/wedlm:/workspace/lab" \
     aiweiliu/wedlm:v3 /bin/bash
   ```

5. **Exit and cleanup**

   ```bash
   docker stop wedlm-demo && docker rm wedlm-demo
   ```

## Optional: helper script

If you prefer a single entrypoint, use `scripts/wedlm_demo.sh` from the repo root:

```bash
./scripts/wedlm_demo.sh
```

The script pulls the image (if missing), starts `wedlm-demo` with GPU support, and prints the exact `docker exec` commands for both the CLI example and the web demo.

## Smoke prompts

The lab ships with `smoke_prompts.txt` for quick validation and to time TTFT/tokens-per-second. See `/workspace/lab/smoke_prompts.txt` when inside the container.
