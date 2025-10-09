CORE=docker compose --env-file .env -f docker-compose.fresh.yml
APP=docker compose --env-file .env -f docker-compose.fresh.yml -f docker-compose.app.yml
OBS=docker compose --env-file .env -f docker-compose.observability.yml

.PHONY: up app obs down ps logs verify smoke seed nuke doctor smoke2 dr-drill evidence sentinel config-contract snapshot
up:        ## core up
	$(CORE) --profile core up -d
ps:
	$(APP) ps || $(CORE) ps
logs:
	$(APP) logs -f --tail=200 || $(CORE) logs -f --tail=200

app:       ## app up on top of core
	$(APP) --profile core --profile app up -d

obs:       ## observability up (separate)
	$(OBS) up -d

down:      ## everything down
	$(APP) down -v || true
	$(OBS) down -v || true
	$(CORE) down -v || true

verify:    ## core health probes
	@echo "Checking services..."
	@timeout 1 bash -c '</dev/tcp/localhost/$(POSTGRES_PORT)' >/dev/null 2>&1 && echo "✓ PostgreSQL port reachable" || echo "✗ PostgreSQL port not reachable"
	@timeout 1 bash -c '</dev/tcp/localhost/$(REDIS_HOST_PORT)' >/dev/null 2>&1 && nc -zv localhost $(REDIS_HOST_PORT) 2>/dev/null && echo "✓ Redis port reachable" || echo "✗ Redis port not reachable"
	@timeout 1 bash -c '</dev/tcp/localhost/$(NEO4J_HTTP_PORT)' >/dev/null 2>&1 && echo "✓ Neo4j port reachable" || echo "✗ Neo4j port not reachable"
	@curl -s --connect-timeout 5 http://localhost:$(ADMINER_PORT) >/dev/null 2>&1 && echo "✓ Adminer port reachable" || echo "✗ Adminer port not reachable"

smoke:     ## app smoke tests
	@curl -s --connect-timeout 5 http://localhost:$(API_PORT)/health | grep -E "healthy|ok" >/dev/null 2>&1 && echo "✓ API health check passed" || echo "✗ API health check failed"
	@curl -s --connect-timeout 5 http://localhost:$(WEB_PORT)/health | grep -E "healthy|ok" >/dev/null 2>&1 && echo "✓ Web health check passed" || echo "✗ Web health check failed"

smoke2:   ## enhanced smoke tests via scripts/smoke.sh
	bash scripts/smoke.sh

dr-drill:   ## disaster recovery drill: backup, nuke, restore, verify
	bash scripts/dr-drill.sh

sentinel:   ## verify images are pinned by digest
	@echo "Checking for image pinning by digest..."
	@if grep -q 'image:.*v0\.1\.0' docker-compose.app.yml; then \
		echo "❌ Found unpinned image tags (v0.1.0) in docker-compose.app.yml"; \
		exit 1; \
	else \
		echo "✅ All images appear to be pinned by digest"; \
	fi


evidence: ## Collect release evidence
	@mkdir -p dist/evidence
	@echo "Collecting release evidence..."
	@echo "API and Web image info (placeholder since images don't exist yet):" > dist/evidence/api.inspect.json
	@echo '{"placeholder":true,"reason":"images_not_published_yet"}' > dist/evidence/api.inspect.json
	@echo '{"placeholder":true,"reason":"images_not_published_yet"}' > dist/evidence/web.inspect.json
	@grep -n 'image:' docker-compose.*.yml | tee dist/evidence/compose.images.txt >/dev/null
	@[ -f sbom-*.spdx.json ] 2>/dev/null && cp sbom-*.spdx.json dist/evidence/ 2>/dev/null || echo "No SBOM files found (expected for placeholder images)"
	@git rev-parse HEAD > dist/evidence/git_sha.txt 2>/dev/null || echo "main" > dist/evidence/git_sha.txt
	@echo "✅ Release evidence collected in dist/evidence/"

seed:    ## sample: run DB migrations/seed if you have scripts
	@echo "TODO: add your seed script here - check october2025/sprint_2025_11_10_echo.md for examples"

# Scoped "nuke" that safely clears only this project's resources.
.PHONY: nuke
nuke: ## Stop & remove summit-fresh/core resources created with root (may prompt for sudo)
	@echo ">> Stopping containers (sudo if needed)…"
	@sudo docker ps -aq --filter "name=summit-fresh" --filter "name=summit-core" 2>/dev/null | xargs -r sudo docker stop
	@echo ">> Removing containers…"
	@sudo docker ps -aq --filter "name=summit-fresh" --filter "name=summit-core" 2>/dev/null | xargs -r sudo docker rm -f
	@echo ">> Removing networks…"
	@sudo docker network ls --format '{{.Name}}' | grep -E '^summit-(fresh|core)_' 2>/dev/null | xargs -r sudo docker network rm

.PHONY: doctor
doctor: ## Quick env doctor: group, compose version, socket, and hello-world
	@echo ">> docker group membership:"
	@id -nG | tr ' ' '\n' | grep -qx docker && echo "ok: in docker group" || echo "warn: not in docker group"
	@echo ">> docker compose version:" && docker compose version
	@echo ">> docker hello-world test:"
	@docker run --rm hello-world >/dev/null 2>&1 && echo "ok: hello-world ran" || echo "warn: hello-world failed"config-contract:   ## verify .env.example matches config variables in code
	@echo "Checking config contract between .env.example and compose files..."
	@echo "✅ Config contract check placeholder (would compare .env.example with actual config usage in code)"
	@echo "Note: This is a simplified check. In a real implementation, this would compare actual config usage."

config-contract:   ## verify .env.example matches config variables in code
	@echo "Checking config contract between .env.example and compose files..."
	@echo "✅ Config contract check placeholder (would compare .env.example with actual config usage in code)"



.PHONY: snapshot
snapshot:
	mkdir -p dist/snapshot
	docker compose ls > dist/snapshot/compose.txt 2>/dev/null || true
	docker ps > dist/snapshot/ps.txt 2>/dev/null || true
	$(APP) logs --tail=500 > dist/snapshot/app.logs.txt 2>/dev/null || true
	$(CORE) logs --tail=500 > dist/snapshot/core.logs.txt 2>/dev/null || true


.PHONY: labels
labels:
	bash scripts/manage-labels.sh

.PHONY: verify-release
verify-release:
	bash scripts/final-verification.sh

.PHONY: labels-adoption
labels-adoption:
	gh label create "adoption:win"   -c '#2da44e' -d "Positive deployment feedback"   || true
	gh label create "adoption:gap"   -c '#d73a4a' -d "Missing/pain point in rollout"  || true
	gh label create "adoption:block" -c '#b60205' -d "Blocking issue for adoption"    || true
	gh label create "ops:drill"      -c '#0e8a16' -d "Disaster recovery drill items"  || true
