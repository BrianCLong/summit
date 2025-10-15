{{- define "neo4j.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "neo4j.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "neo4j.labels" -}}
app.kubernetes.io/name: {{ include "neo4j.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "neo4j.matchLabels" -}}
{{- $root := index . "root" -}}
{{- $component := index . "component" | default "core" -}}
app.kubernetes.io/name: {{ include "neo4j.name" $root }}
app.kubernetes.io/instance: {{ $root.Release.Name }}
app.kubernetes.io/component: {{ $component }}
{{- end -}}

{{- define "neo4j.totalCores" -}}
{{- $vals := dict "count" (int .Values.regions.primary.coreReplicas) -}}
{{- range .Values.regions.secondary }}
{{- $_ := set $vals "count" (add $vals.count (int .coreReplicas)) -}}
{{- end -}}
{{- $vals.count -}}
{{- end -}}
