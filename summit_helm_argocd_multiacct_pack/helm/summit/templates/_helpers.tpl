{{- define "summit.labels" -}}
app.kubernetes.io/name: {{ include "summit.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "summit.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "summit.fullname" -}}
{{- printf "%s-%s" (include "summit.name" .) .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "summit.serviceAccountName" -}}
{{- if .Values.serviceAccount.name }}
{{- .Values.serviceAccount.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-sa" (include "summit.name" .) | trunc 63 | trimSuffix "-" }}
{{- end -}}
{{- end -}}

{{- define "summit.rbacServiceAccountName" -}}
{{- $name := index . "name" -}}
{{- $root := index . "root" -}}
{{- if $name }}
{{- $name | trunc 63 | trimSuffix "-" }}
{{- else -}}
{{- printf "%s-%s" (include "summit.name" $root) (index . "suffix") | trunc 63 | trimSuffix "-" }}
{{- end -}}
{{- end -}}

{{- define "summit.validateNoInlineSecrets" -}}
{{- $env := .env | default (list) -}}
{{- range $idx, $item := $env }}
  {{- if and ($item.name) (hasKey $item "value") -}}
    {{- $lower := lower $item.name -}}
    {{- if or (contains "secret" $lower) (contains "token" $lower) (contains "password" $lower) (contains "key" $lower) -}}
      {{- fail (printf "env[%d] uses inline secret-like value for %s; use valueFrom or ExternalSecret" $idx $item.name) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- end -}}
