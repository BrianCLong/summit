{{- define "mc-runner.name" -}}
{{ include "mc-runner.fullname" . }}
{{- end -}}

{{- define "mc-runner.fullname" -}}
{{- printf "%s" .Chart.Name -}}
{{- end -}}

{{- define "mc-runner.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{ default (printf "%s-sa" .Chart.Name) .Values.serviceAccount.name }}
{{- else -}}
default
{{- end -}}
{{- end -}}
