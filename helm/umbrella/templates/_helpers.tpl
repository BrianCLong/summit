{{- define "umbrella.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "umbrella.workloadName" -}}
{{- $name := index . 0 -}}
{{- printf "%s-%s" (include "umbrella.fullname" (index . 1)) $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "umbrella.merge" -}}
{{- $dst := (deepCopy (index . 0)) -}}
{{- $src := (index . 1) -}}
{{- mergeOverwrite $dst $src -}}
{{- end -}}
