{{- define "intelgraph-api.name" -}}{{ include "intelgraph-api.chart" . }}{{- end -}}
{{- define "intelgraph-api.fullname" -}}{{ include "intelgraph-api.name" . }}-{{ .Release.Name }}{{- end -}}
{{- define "intelgraph-api.stableServiceName" -}}{{ include "intelgraph-api.fullname" . }}-stable{{- end -}}
{{- define "intelgraph-api.canaryServiceName" -}}{{ include "intelgraph-api.fullname" . }}-canary{{- end -}}
{{- define "intelgraph-api.ingressName" -}}{{ include "intelgraph-api.fullname" . }}-ing{{- end -}}

{{- define "intelgraph-api.labels" -}}
helm.sh/chart: {{ include "intelgraph-api.chart" . }}
{{ include "intelgraph-api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "intelgraph-api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "intelgraph-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}