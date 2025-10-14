#!/usr/bin/env bash
set -euo pipefail
type="${1:-py-svc}"; name="${2:-example}"
mkdir -p "$name" && cd "$name"

common_files() {
cat > .editorconfig <<'EOF'
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
EOF
cat > .gitignore <<'EOF'
.venv/
.uv/
node_modules/
dist/
build/
__pycache__/
.env
.env.*
.DS_Store
EOF
cat > .pre-commit-config.yaml <<'YAML'
repos:
- repo: https://github.com/pre-commit/pre-commit-hooks
  rev: v4.6.0
  hooks: [ {id: end-of-file-fixer}, {id: trailing-whitespace} ]
- repo: https://github.com/psf/black
  rev: 24.8.0
  hooks: [ {id: black} ]
- repo: https://github.com/charliermarsh/ruff-pre-commit
  rev: v0.6.8
  hooks: [ {id: ruff, args: [--fix]} ]
YAML
git init -q
git add .
git commit -m "chore: init scaffold" >/dev/null
}

case "$type" in
  py-svc)
    mkdir -p src tests
    cat > pyproject.toml <<'TOML'
[project]
name = "app"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = ["fastapi","uvicorn[standard]","pydantic","httpx"]
[tool.ruff]
line-length = 100
TOML
    cat > src/main.py <<'PY'
from fastapi import FastAPI
app = FastAPI()
@app.get("/healthz") 
def healthz(): return {"ok": True}
PY
    cat > Dockerfile <<'DOCKER'
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml /app/
RUN pip install --no-cache-dir uv && uv pip install --system -r <(uv pip compile --generate-hashes pyproject.toml)
COPY src/ /app/src/
EXPOSE 8080
CMD ["uvicorn","src.main:app","--host","0.0.0.0","--port","8080"]
DOCKER
    cat > Makefile <<'MK'
.PHONY: venv run test lint docker
venv: ; uv venv && . .venv/bin/activate && uv pip install -e .
run: ; uv run uvicorn src.main:app --reload --port 8080
lint: ; pre-commit run -a || true
docker: ; docker build -t app:dev .
MK
    common_files
    ;;
  node-svc)
    mkdir -p src
    cat > package.json <<'JSON'
{
  "name": "webapp",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node src/index.js", "lint": "prettier -c ."},
  "devDependencies": { "prettier": "^3.3.3" },
  "dependencies": { "hono": "^4.5.10" }
}
JSON
    cat > src/index.js <<'JS'
import { Hono } from 'hono'
const app = new Hono()
app.get('/healthz', c => c.json({ ok: true }))
export default app
if (import.meta.main) Bun ? Bun.serve({ fetch: app.fetch, port: 8080 }) :
  (await import('node:http')).createServer((await import('node:stream')).Duplex.toWeb ?
  (await import('node:http')).createServer(app.fetch) : (req,res)=>res.end('use bun')).listen(8080)
JS
    cat > Dockerfile <<'DOCKER'
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN corepack enable && npm ci
COPY src ./src
EXPOSE 8080
CMD ["node","src/index.js"]
DOCKER
    cat > .prettierrc <<'JSON'
{"singleQuote": true, "semi": false}
JSON
    cat > Makefile <<'MK'
.PHONY: dev lint docker
dev: ; node src/index.js
lint: ; npx prettier -w .
docker: ; docker build -t webapp:dev .
MK
    common_files
    ;;
  tf-module)
    mkdir -p modules/"$name" examples/basic
    cat > modules/"$name"/main.tf <<'TF'
terraform {
  required_version = ">= 1.6"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.region }
variable "region" { type = string }
output "example" { value = "ok" }
TF
    cat > examples/basic/main.tf <<'TF'
module "mod" {
  source = "../../modules/REPLACEME"
  region = var.region
}
variable "region" { default = "us-east-1" }
output "out" { value = module.mod.example }
TF
    sed -i.bak "s/REPLACEME/$name/g" examples/basic/main.tf 2>/dev/null || \
      perl -0777 -pe "s/REPLACEME/$name/g" -i examples/basic/main.tf
    cat > .tflint.hcl <<'HCL'
plugin "aws" { enabled = true }
HCL
    cat > Makefile <<'MK'
.PHONY: fmt init plan
fmt: ; terraform fmt -recursive
init: ; cd examples/basic && terraform init
plan: ; cd examples/basic && terraform plan
MK
    common_files
    ;;
  *)
    echo "unknown template. Options: py-svc | node-svc | tf-module" >&2; exit 1;;
esac

echo "Scaffolded $type in $PWD"

