{{/*
Expand the name of the chart.
*/}}
{{- define "summit.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "summit.fullname" -}}
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
{{- define "summit.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "summit.labels" -}}
helm.sh/chart: {{ include "summit.chart" . }}
{{ include "summit.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: summit
{{- end }}

{{/*
Selector labels
*/}}
{{- define "summit.selectorLabels" -}}
app.kubernetes.io/name: {{ include "summit.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "summit.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "summit.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the appropriate apiVersion for deployment
*/}}
{{- define "summit.deployment.apiVersion" -}}
{{- if or (eq .Values.deploymentStrategy "blue-green") (eq .Values.deploymentStrategy "canary") -}}
argoproj.io/v1alpha1
{{- else -}}
apps/v1
{{- end -}}
{{- end -}}

{{/*
Return the appropriate kind for deployment
*/}}
{{- define "summit.deployment.kind" -}}
{{- if or (eq .Values.deploymentStrategy "blue-green") (eq .Values.deploymentStrategy "canary") -}}
Rollout
{{- else -}}
Deployment
{{- end -}}
{{- end -}}

{{/*
Get image pull policy
*/}}
{{- define "summit.imagePullPolicy" -}}
{{- if eq .Values.global.environment "development" -}}
Always
{{- else -}}
{{- .Values.image.pullPolicy }}
{{- end -}}
{{- end -}}

{{/*
Generate environment variables
*/}}
{{- define "summit.envVars" -}}
- name: NODE_ENV
  value: {{ .Values.env.NODE_ENV | quote }}
- name: LOG_LEVEL
  value: {{ .Values.env.LOG_LEVEL | quote }}
- name: DEPLOYMENT_STRATEGY
  value: {{ .Values.deploymentStrategy | quote }}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
{{- end -}}

{{/*
Generate resource requests and limits
*/}}
{{- define "summit.resources" -}}
requests:
  cpu: {{ .Values.resources.requests.cpu }}
  memory: {{ .Values.resources.requests.memory }}
limits:
  cpu: {{ .Values.resources.limits.cpu }}
  memory: {{ .Values.resources.limits.memory }}
{{- end -}}

{{/*
Generate liveness probe
*/}}
{{- define "summit.livenessProbe" -}}
{{- if .Values.healthChecks.liveness.enabled }}
livenessProbe:
  httpGet:
    path: {{ .Values.healthChecks.liveness.path }}
    port: {{ .Values.service.targetPort }}
  initialDelaySeconds: {{ .Values.healthChecks.liveness.initialDelaySeconds }}
  periodSeconds: {{ .Values.healthChecks.liveness.periodSeconds }}
  timeoutSeconds: {{ .Values.healthChecks.liveness.timeoutSeconds }}
  failureThreshold: {{ .Values.healthChecks.liveness.failureThreshold }}
{{- end }}
{{- end -}}

{{/*
Generate readiness probe
*/}}
{{- define "summit.readinessProbe" -}}
{{- if .Values.healthChecks.readiness.enabled }}
readinessProbe:
  httpGet:
    path: {{ .Values.healthChecks.readiness.path }}
    port: {{ .Values.service.targetPort }}
  initialDelaySeconds: {{ .Values.healthChecks.readiness.initialDelaySeconds }}
  periodSeconds: {{ .Values.healthChecks.readiness.periodSeconds }}
  timeoutSeconds: {{ .Values.healthChecks.readiness.timeoutSeconds }}
  failureThreshold: {{ .Values.healthChecks.readiness.failureThreshold }}
{{- end }}
{{- end -}}

{{/*
Generate startup probe
*/}}
{{- define "summit.startupProbe" -}}
{{- if .Values.healthChecks.startup.enabled }}
startupProbe:
  httpGet:
    path: {{ .Values.healthChecks.startup.path }}
    port: {{ .Values.service.targetPort }}
  initialDelaySeconds: {{ .Values.healthChecks.startup.initialDelaySeconds }}
  periodSeconds: {{ .Values.healthChecks.startup.periodSeconds }}
  timeoutSeconds: {{ .Values.healthChecks.startup.timeoutSeconds }}
  failureThreshold: {{ .Values.healthChecks.startup.failureThreshold }}
{{- end }}
{{- end -}}

{{/*
Get database connection string
*/}}
{{- define "summit.neo4jUri" -}}
{{- if .Values.database.neo4j.uri -}}
{{ .Values.database.neo4j.uri }}
{{- else -}}
bolt://{{ .Release.Name }}-neo4j:7687
{{- end -}}
{{- end -}}

{{/*
Get PostgreSQL connection string
*/}}
{{- define "summit.postgresUri" -}}
{{- if .Values.database.postgresql.host -}}
postgresql://{{ .Values.database.postgresql.host }}:{{ .Values.database.postgresql.port }}/{{ .Values.database.postgresql.database }}
{{- else -}}
postgresql://{{ .Release.Name }}-postgresql:5432/summit
{{- end -}}
{{- end -}}

{{/*
Get Redis connection string
*/}}
{{- define "summit.redisUri" -}}
{{- if .Values.database.redis.host -}}
redis://{{ .Values.database.redis.host }}:{{ .Values.database.redis.port }}
{{- else -}}
redis://{{ .Release.Name }}-redis-master:6379
{{- end -}}
{{- end -}}
