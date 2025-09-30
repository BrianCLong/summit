SHELL := /bin/bash

.PHONY: help bootstrap dev lint build test stack-up stack-down tauri-dev tauri-build ingest-worker summarizer dev-server gmail-watch-all graph-subs-all asr-up asr-down k8s-whisper-apply k8s-whisper-delete

help:
	@echo "Targets:"
	@echo "  bootstrap     Install client deps with local cache fallback"
	@echo "  dev           Run client dev server"
	@echo "  lint          Lint client"
	@echo "  build         Build client"
	@echo "  test          Run client tests"
	@echo "  stack-up      docker compose up for local services"
	@echo "  stack-down    docker compose down"

CACHE ?= $(HOME)/.cache/npm-companyos

bootstrap:
	mkdir -p "$(CACHE)"
	cd client && rm -rf node_modules package-lock.json && NPM_CONFIG_CACHE="$(CACHE)" npm install

dev:
	cd client && npm run dev

lint:
	cd client && npm run lint || true

build:
	cd client && npm run build

test:
	cd client && npm test || true

stack-up:
	docker compose -f deploy/local/docker-compose.switchboard.yml up -d

stack-down:
	docker compose -f deploy/local/docker-compose.switchboard.yml down

tauri-dev:
	cd client && npm run tauri dev

tauri-build:
	cd client && npm run tauri build

ingest-worker:
	node --loader ts-node/esm server/src/dev/registerGmailWatchAll.ts
summarizer:
	node --loader ts-node/esm server/src/dev/summarizerRunner.ts
dev-server:
	node --loader ts-node/esm server/src/index.ts

gmail-watch-all:
	npm run tsnode -- server/src/dev/registerGmailWatchAll.ts

graph-subs-all:
	npm run tsnode -- server/src/dev/ensureGraphSubsAll.ts

asr-up:
	docker compose -f deploy/local/docker-compose.whisper.yml up -d
asr-down:
	docker compose -f deploy/local/docker-compose.whisper.yml down

# K8s whisper stack
.PHONY: k8s-whisper-apply k8s-whisper-delete
k8s-whisper-apply:
	kubectl apply -f deploy/k8s/whisper/ns.yaml
	kubectl apply -f deploy/k8s/whisper/configmap.yaml
	kubectl apply -f deploy/k8s/whisper/whisper-deployment.yaml
	kubectl apply -f deploy/k8s/whisper/bridge-deployment.yaml
	kubectl apply -f deploy/k8s/whisper/scale-and-policy.yaml
# kubectl apply -f deploy/k8s/whisper/ingress.yaml

k8s-whisper-delete:
	kubectl delete -f deploy/k8s/whisper/ingress.yaml --ignore-not-found
	kubectl delete -f deploy/k8s/whisper/scale-and-policy.yaml --ignore-not-found
	kubectl delete -f deploy/k8s/whisper/bridge-deployment.yaml --ignore-not-found
	kubectl delete -f deploy/k8s/whisper/whisper-deployment.yaml --ignore-not-found
	kubectl delete -f deploy/k8s/whisper/configmap.yaml --ignore-not-found
	kubectl delete -f deploy/k8s/whisper/ns.yaml --ignore-not-found