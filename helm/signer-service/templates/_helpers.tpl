{{- define "signer-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "signer-service.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "signer-service.labels" -}}
app.kubernetes.io/name: {{ include "signer-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "signer-service.policyBundlesName" -}}
{{- printf "%s-policy-bundles" (include "signer-service.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
