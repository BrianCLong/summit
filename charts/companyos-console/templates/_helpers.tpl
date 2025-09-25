{{- define "companyos-console.name" -}}
{{ include "companyos-console.fullname" . }}
{{- end -}}

{{- define "companyos-console.fullname" -}}
{{- printf "%s" .Chart.Name -}}
{{- end -}}

{{- define "companyos-console.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{ default (printf "%s-sa" .Chart.Name) .Values.serviceAccount.name }}
{{- else -}}
default
{{- end -}}
{{- end -}}
