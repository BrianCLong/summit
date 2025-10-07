# ---- Hugging Face Spaces config (override via env) ----
HF_USER         ?= BrianCLong
HF_STATIC_SPACE ?= summit-ui-static
HF_DOCKER_SPACE ?= summit-mock-docker
HF_DOCS_SPACE   ?= summit-docs

# ---- Folders (relative to repo root) ----
HF_STATIC_DIR   ?= summit/hf-space-static
HF_DOCKER_DIR   ?= summit/hf-space-docker
HF_DOCS_DIR     ?= summit/hf-space-docs

.PHONY: deploy-hf deploy-hf-static deploy-hf-docker deploy-hf-docs hf-check

# Deploy both Spaces (Static UI + Docker API)
deploy-hf: hf-check deploy-hf-static deploy-hf-docker deploy-hf-docs

# Deploy only Static Space
deploy-hf-static: hf-check
	./deploy-hf.sh "$(HF_USER)" "$(HF_STATIC_SPACE)" "$(HF_STATIC_DIR)"

# Deploy only Docker Space
deploy-hf-docker: hf-check
	./deploy-hf.sh "$(HF_USER)" "$(HF_DOCKER_SPACE)" "$(HF_DOCKER_DIR)"

# Deploy only Docs Space
deploy-hf-docs: hf-check
	./deploy-hf.sh "$(HF_USER)" "$(HF_DOCS_SPACE)" "$(HF_DOCS_DIR)"

# Quick preflight
hf-check:
	@command -v huggingface-cli >/dev/null || (echo "ERROR: huggingface-cli not found. pip install -U 'huggingface_hub[cli]'" && exit 1)
	@command -v git >/dev/null || (echo "ERROR: git not found." && exit 1)