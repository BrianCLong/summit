{{- define "intelgraph-api.name" -}}
{{ include "intelgraph-api.fullname" . }}
{{- end -}}

{{- define "intelgraph-api.fullname" -}}
{{- printf "%s" .Chart.Name -}}
{{- end -}}

{{- define "intelgraph-api.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{ default (printf "%s-sa" .Chart.Name) .Values.serviceAccount.name }}
{{- else -}}
default
{{- end -}}
{{- end -}}
