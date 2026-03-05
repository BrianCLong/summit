#!/usr/bin/env bash
set -euo pipefail
type="${1:-py-svc}"; name="${2:-example}"
mkdir -p "$name" && cd "$name"

generate_helm_chart() {
  local app_name=$1
  mkdir -p charts/"$app_name"/templates

  cat > charts/"$app_name"/Chart.yaml <<YAML
apiVersion: v2
name: $app_name
description: A Helm chart for $app_name
type: application
version: 0.1.0
appVersion: "0.1.0"
YAML

  cat > charts/"$app_name"/values.yaml <<YAML
replicaCount: 1
image:
  repository: $app_name
  pullPolicy: IfNotPresent
  tag: "latest"
service:
  type: ClusterIP
  port: 8080
ingress:
  enabled: false
resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
YAML

  cat > charts/"$app_name"/templates/deployment.yaml <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "chart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
YAML

  cat > charts/"$app_name"/templates/service.yaml <<YAML
apiVersion: v1
kind: Service
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "chart.selectorLabels" . | nindent 4 }}
YAML

  cat > charts/"$app_name"/templates/_helpers.tpl <<YAML
{{/*
Expand the name of the chart.
*/}}
{{- define "chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
YAML
}

generate_opa_policy() {
  local app_name=$1
  mkdir -p policies
  cat > policies/policy.rego <<'REGO'
package app.authz

import rego.v1
import data.common.authz

# Default deny
default allow := false

# Allow if common authz allows
allow if {
    authz.allow
}

# Service specific rules
allow if {
    input.action == "health_check"
}
REGO
}

generate_observability_config() {
  local app_name=$1
  mkdir -p monitoring
  cat > monitoring/dashboard.json <<'JSON'
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "target": {
          "limit": 100,
          "matchAny": false,
          "tags": [],
          "type": "dashboard"
        },
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "panels": [
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 0, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "auto", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [ { "color": "green", "value": null }, { "color": "red", "value": 80 } ] }
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "id": 1,
      "options": { "legend": { "calcs": [], "displayMode": "list", "placement": "bottom" }, "tooltip": { "mode": "single", "sort": "none" } },
      "targets": [ { "expr": "sum(rate(http_requests_total{job=\"{{SERVICE_NAME}}\"}[5m]))", "legendFormat": "Total Requests", "refId": "A" } ],
      "title": "Request Rate (RPS)",
      "type": "timeseries"
    },
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 0, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "auto", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [ { "color": "green", "value": null }, { "color": "red", "value": 5 } ] },
          "unit": "percent"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "id": 2,
      "options": { "legend": { "calcs": [], "displayMode": "list", "placement": "bottom" }, "tooltip": { "mode": "single", "sort": "none" } },
      "targets": [ { "expr": "sum(rate(http_requests_total{job=\"{{SERVICE_NAME}}\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"{{SERVICE_NAME}}\"}[5m])) * 100", "legendFormat": "Error Rate %", "refId": "A" } ],
      "title": "Error Rate (%)",
      "type": "timeseries"
    },
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "palette-classic" },
          "custom": { "axisLabel": "", "axisPlacement": "auto", "barAlignment": 0, "drawStyle": "line", "fillOpacity": 0, "gradientMode": "none", "hideFrom": { "legend": false, "tooltip": false, "viz": false }, "lineInterpolation": "linear", "lineWidth": 1, "pointSize": 5, "scaleDistribution": { "type": "linear" }, "showPoints": "auto", "spanNulls": false, "stacking": { "group": "A", "mode": "none" }, "thresholdsStyle": { "mode": "off" } },
          "mappings": [],
          "thresholds": { "mode": "absolute", "steps": [ { "color": "green", "value": null }, { "color": "red", "value": 80 } ] },
          "unit": "s"
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 8 },
      "id": 3,
      "options": { "legend": { "calcs": [], "displayMode": "list", "placement": "bottom" }, "tooltip": { "mode": "single", "sort": "none" } },
      "targets": [ { "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"{{SERVICE_NAME}}\"}[5m])) by (le))", "legendFormat": "P95 Latency", "refId": "A" }, { "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=\"{{SERVICE_NAME}}\"}[5m])) by (le))", "legendFormat": "P99 Latency", "refId": "B" } ],
      "title": "Latency (P95/P99)",
      "type": "timeseries"
    }
  ],
  "schemaVersion": 30,
  "style": "dark",
  "tags": [ "golden-path", "{{SERVICE_NAME}}" ],
  "templating": { "list": [] },
  "time": { "from": "now-6h", "to": "now" },
  "timepicker": {},
  "timezone": "",
  "title": "{{SERVICE_NAME}} - Golden Dashboard",
  "uid": null,
  "version": 0,
  "weekStart": ""
}
JSON
  sed -i.bak "s/{{SERVICE_NAME}}/$app_name/g" monitoring/dashboard.json 2>/dev/null || \
      perl -0777 -pe "s/{{SERVICE_NAME}}/$app_name/g" -i monitoring/dashboard.json
  rm -f monitoring/dashboard.json.bak
}

generate_integration_test() {
  local app_name=$1
  local lang=$2
  mkdir -p tests

  if [ "$lang" == "python" ]; then
    cat > tests/test_integration.py <<'PY'
import requests
import os
import pytest
import time

BASE_URL = os.getenv("BASE_URL", "http://localhost:8080")

def test_healthz():
    # Retry logic for CI/startup
    for i in range(5):
        try:
            response = requests.get(f"{BASE_URL}/healthz")
            if response.status_code == 200:
                assert response.json() == {"ok": True}
                return
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    pytest.fail("Could not connect to service after 5 retries")
PY
  elif [ "$lang" == "node" ]; then
    cat > tests/integration.test.js <<'JS'
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

describe('Integration Tests', () => {
  it('GET /healthz should return 200 OK', async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        const res = await fetch(`${BASE_URL}/healthz`);
        if (res.status === 200) {
          const data = await res.json();
          assert.deepStrictEqual(data, { ok: true });
          return;
        }
      } catch (err) {
        // ignore
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.fail('Could not connect to service after 5 retries');
  });
});
JS
  fi
}

common_files() {
cat > .editorconfig <<'CONFIG'
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
CONFIG
cat > .gitignore <<'IG'
.venv/
.uv/
node_modules/
dist/
build/
__pycache__/
.env
.env.*
.DS_Store
IG
cat > .pre-commit-config.yaml <<'PC'
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
PC
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
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml .
# Install dependencies into a separate directory
RUN uv pip install --system --target=/app/site-packages -r <(uv pip compile --generate-hashes pyproject.toml)

FROM python:3.12-slim
WORKDIR /app
# Copy installed packages
COPY --from=builder /app/site-packages /usr/local/lib/python3.12/site-packages
COPY src/ ./src/
# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
DOCKER
    cat > Makefile <<'MK'
.PHONY: venv run test lint docker
venv: ; uv venv && . .venv/bin/activate && uv pip install -e .
run: ; uv run uvicorn src.main:app --reload --port 8080
lint: ; pre-commit run -a || true
docker: ; docker build -t app:dev .
MK
    generate_helm_chart "$name"
    generate_opa_policy "$name"
    generate_observability_config "$name"
    generate_integration_test "$name" "python"
    common_files
    ;;
  node-svc)
    mkdir -p src
    cat > package.json <<'JSON'
{
  "name": "webapp",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node src/index.js", "lint": "prettier -c .", "test": "node --test" },
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
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN corepack enable && npm ci
COPY src ./src

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 8080
CMD ["node", "src/index.js"]
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
    generate_helm_chart "$name"
    generate_opa_policy "$name"
    generate_observability_config "$name"
    generate_integration_test "$name" "node"
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
    echo "unknown template. Options: py-svc | node-svc | tf-module" >&2; false;;
esac

echo "Scaffolded $type in $PWD"
