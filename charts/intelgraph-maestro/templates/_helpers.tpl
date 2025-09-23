{{/*
Expand the name of the chart.
*/}}
{{- define "intelgraph-maestro.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "intelgraph-maestro.fullname" -}}
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
{{- define "intelgraph-maestro.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "intelgraph-maestro.labels" -}}
helm.sh/chart: {{ include "intelgraph-maestro.chart" . }}
{{ include "intelgraph-maestro.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: intelgraph-maestro
{{- end }}

{{/*
Selector labels
*/}}
{{- define "intelgraph-maestro.selectorLabels" -}}
app.kubernetes.io/name: {{ include "intelgraph-maestro.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "intelgraph-maestro.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "intelgraph-maestro.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate common security context
*/}}
{{- define "intelgraph-maestro.securityContext" -}}
{{- with .Values.global.securityContext }}
runAsNonRoot: {{ .runAsNonRoot }}
runAsUser: {{ .runAsUser }}
runAsGroup: {{ .runAsGroup }}
fsGroup: {{ .fsGroup }}
{{- if .seccompProfile }}
seccompProfile:
  type: {{ .seccompProfile.type }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate pod security context
*/}}
{{- define "intelgraph-maestro.podSecurityContext" -}}
capabilities:
  drop:
  - ALL
readOnlyRootFilesystem: true
allowPrivilegeEscalation: false
{{- if .Values.securityContext }}
{{- with .Values.securityContext }}
{{- if .runAsNonRoot }}
runAsNonRoot: {{ .runAsNonRoot }}
{{- end }}
{{- if .runAsUser }}
runAsUser: {{ .runAsUser }}
{{- end }}
{{- if .runAsGroup }}
runAsGroup: {{ .runAsGroup }}
{{- end }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate common resource requests and limits
*/}}
{{- define "intelgraph-maestro.resources" -}}
{{- $resources := .component.resources | default .Values.global.defaultResources -}}
{{- if $resources }}
resources:
  {{- if $resources.requests }}
  requests:
    {{- if $resources.requests.cpu }}
    cpu: {{ $resources.requests.cpu }}
    {{- end }}
    {{- if $resources.requests.memory }}
    memory: {{ $resources.requests.memory }}
    {{- end }}
  {{- end }}
  {{- if $resources.limits }}
  limits:
    {{- if $resources.limits.cpu }}
    cpu: {{ $resources.limits.cpu }}
    {{- end }}
    {{- if $resources.limits.memory }}
    memory: {{ $resources.limits.memory }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Generate environment variables for database connections
*/}}
{{- define "intelgraph-maestro.databaseEnv" -}}
- name: POSTGRES_HOST
  value: {{ .Values.postgresql.primary.service.name | default "postgresql" | quote }}
- name: POSTGRES_PORT
  value: {{ .Values.postgresql.primary.service.ports.postgresql | default "5432" | quote }}
- name: POSTGRES_DB
  value: {{ .Values.postgresql.auth.database | quote }}
- name: POSTGRES_USER
  value: {{ .Values.postgresql.auth.username | quote }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.postgresql.auth.existingSecret | default "postgresql-secret" }}
      key: postgres-password
- name: NEO4J_URI
  value: "bolt://{{ .Values.neo4j.core.name | default "neo4j" }}:7687"
- name: NEO4J_USER
  value: "neo4j"
- name: NEO4J_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.neo4j.auth.existingSecret | default "neo4j-secret" }}
      key: neo4j-password
- name: REDIS_URL
  value: "redis://{{ .Values.redis.master.service.name | default "redis-master" }}:6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.redis.auth.existingSecret | default "redis-secret" }}
      key: redis-password
- name: KAFKA_BROKERS
  value: {{ .Values.kafka.service.name | default "kafka" }}:9092
{{- end }}

{{/*
Generate common node selector
*/}}
{{- define "intelgraph-maestro.nodeSelector" -}}
{{- if .Values.nodeSelector }}
nodeSelector:
  {{- toYaml .Values.nodeSelector | nindent 2 }}
{{- else if .Values.global.nodeSelector }}
nodeSelector:
  {{- toYaml .Values.global.nodeSelector | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate common tolerations
*/}}
{{- define "intelgraph-maestro.tolerations" -}}
{{- if .Values.tolerations }}
tolerations:
  {{- toYaml .Values.tolerations | nindent 2 }}
{{- else if .Values.global.tolerations }}
tolerations:
  {{- toYaml .Values.global.tolerations | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate topology spread constraints
*/}}
{{- define "intelgraph-maestro.topologySpreadConstraints" -}}
{{- if .Values.topologySpreadConstraints.enabled }}
topologySpreadConstraints:
- maxSkew: {{ .Values.topologySpreadConstraints.maxSkew }}
  topologyKey: {{ .Values.topologySpreadConstraints.topologyKey }}
  whenUnsatisfiable: {{ .Values.topologySpreadConstraints.whenUnsatisfiable }}
  labelSelector:
    matchLabels:
      {{- include "intelgraph-maestro.selectorLabels" . | nindent 6 }}
{{- end }}
{{- end }}

{{/*
Generate affinity rules
*/}}
{{- define "intelgraph-maestro.affinity" -}}
{{- if .Values.nodeAffinity.enabled }}
affinity:
  nodeAffinity:
    {{- if .Values.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution }}
    requiredDuringSchedulingIgnoredDuringExecution:
      {{- toYaml .Values.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution | nindent 6 }}
    {{- end }}
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            {{- include "intelgraph-maestro.selectorLabels" . | nindent 12 }}
        topologyKey: kubernetes.io/hostname
{{- end }}
{{- end }}

{{/*
Generate monitoring annotations
*/}}
{{- define "intelgraph-maestro.monitoringAnnotations" -}}
{{- if .Values.monitoring.metrics.enabled }}
prometheus.io/scrape: "true"
prometheus.io/port: {{ .Values.monitoring.metrics.port | quote }}
prometheus.io/path: {{ .Values.monitoring.metrics.path | quote }}
{{- end }}
{{- end }}

{{/*
Generate common pod annotations
*/}}
{{- define "intelgraph-maestro.podAnnotations" -}}
{{- if .Values.podAnnotations }}
{{- toYaml .Values.podAnnotations }}
{{- end }}
{{- include "intelgraph-maestro.monitoringAnnotations" . }}
{{- end }}