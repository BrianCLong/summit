{{/*
Expand the name of the chart.
*/}}
{{- define "intelgraph.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Build an image reference that enforces digest pinning.
*/}}
{{- define "intelgraph.imageWithDigest" -}}
{{- $image := .image -}}
{{- if not $image.repository }}
{{- fail "image.repository is required" }}
{{- end }}
{{- if not $image.digest }}
{{- fail (printf "image.digest is required for %s" (default "component" .name)) }}
{{- end }}
{{- printf "%s@%s" $image.repository $image.digest -}}
{{- end }}

{{/*
Resolve service images and enforce digest pinning for optional components.
*/}}
{{- define "intelgraph.image" -}}
{{- $service := .service -}}
{{- $name := default "service" $service.name -}}
{{- if not $service.image }}
{{- fail (printf "image configuration is required for %s" $name) }}
{{- end }}
{{- include "intelgraph.imageWithDigest" (dict "image" $service.image "name" $name) -}}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "intelgraph.fullname" -}}
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
{{- define "intelgraph.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "intelgraph.labels" -}}
helm.sh/chart: {{ include "intelgraph.chart" . }}
app.kubernetes.io/name: {{ include "intelgraph.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "intelgraph.selectorLabels" -}}
app.kubernetes.io/name: {{ include "intelgraph.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "intelgraph.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "intelgraph.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}