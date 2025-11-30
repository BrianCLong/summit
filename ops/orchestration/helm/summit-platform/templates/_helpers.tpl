{{- define "summit-platform.fullname" -}}
{{- printf "%s" .Release.Name -}}
{{- end -}}

{{- define "summit-platform.labels" -}}
app.kubernetes.io/name: {{ include "summit-platform.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
