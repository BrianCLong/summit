{{/*
Expand the name of the chart.
*/}}
{{- define "maestro.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "maestro.fullname" -}}
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
{{- define "maestro.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "maestro.labels" -}}
helm.sh/chart: {{ include "maestro.chart" . }}
{{ include "maestro.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: maestro-orchestration-system
app.kubernetes.io/component: orchestrator
{{- end }}

{{/*
Selector labels
*/}}
{{- define "maestro.selectorLabels" -}}
app.kubernetes.io/name: {{ include "maestro.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "maestro.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "maestro.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the secret name for pulling images
*/}}
{{- define "maestro.imagePullSecretName" -}}
{{- if .Values.image.pullSecrets }}
{{- range .Values.image.pullSecrets }}
{{- .name }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate certificates for maestro webhooks 
*/}}
{{- define "maestro.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s" (include "maestro.name" .) .Release.Namespace ) ( printf "%s.%s.svc" (include "maestro.name" .) .Release.Namespace ) -}}
{{- $ca := genCA "maestro-ca" 365 -}}
{{- $cert := genSignedCert ( include "maestro.name" . ) nil $altNames 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
ca.crt: {{ $ca.Cert | b64enc }}
{{- end }}

{{/*
Return the appropriate apiVersion for deployment.
*/}}
{{- define "maestro.deployment.apiVersion" -}}
{{- if semverCompare ">=1.9-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "apps/v1" -}}
{{- else -}}
{{- print "extensions/v1beta1" -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for ingress.
*/}}
{{- define "maestro.ingress.apiVersion" -}}
{{- if and (.Capabilities.APIVersions.Has "networking.k8s.io/v1") (semverCompare ">=1.19-0" .Capabilities.KubeVersion.GitVersion) -}}
{{- print "networking.k8s.io/v1" -}}
{{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1" -}}
{{- print "networking.k8s.io/v1beta1" -}}
{{- else -}}
{{- print "extensions/v1beta1" -}}
{{- end -}}
{{- end -}}

{{/*
Return if ingress is stable.
*/}}
{{- define "maestro.ingress.isStable" -}}
{{- eq (include "maestro.ingress.apiVersion" .) "networking.k8s.io/v1" -}}
{{- end -}}

{{/*
Return if ingress supports ingressClassName.
*/}}
{{- define "maestro.ingress.supportsIngressClassName" -}}
{{- or (eq (include "maestro.ingress.isStable" .) "true") (and (eq (include "maestro.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">=1.18-0" .Capabilities.KubeVersion.GitVersion)) -}}
{{- end -}}

{{/*
Return if ingress supports pathType.
*/}}
{{- define "maestro.ingress.supportsPathType" -}}
{{- or (eq (include "maestro.ingress.isStable" .) "true") (and (eq (include "maestro.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">=1.18-0" .Capabilities.KubeVersion.GitVersion)) -}}
{{- end -}}

{{/*
Common environment variables
*/}}
{{- define "maestro.commonEnv" -}}
- name: NODE_ENV
  value: {{ .Values.global.environment | default "production" }}
- name: SERVICE_NAME
  value: {{ include "maestro.name" . }}
- name: SERVICE_VERSION
  value: {{ .Chart.AppVersion | default .Values.image.tag }}
- name: NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
- name: NODE_NAME
  valueFrom:
    fieldRef:
      fieldPath: spec.nodeName
{{- end }}

{{/*
Resource requirements for maestro containers
*/}}
{{- define "maestro.resources" -}}
{{- if .Values.resources -}}
{{- toYaml .Values.resources | nindent 2 -}}
{{- else -}}
requests:
  memory: "512Mi"
  cpu: "250m"
limits:
  memory: "2Gi"
  cpu: "1000m"
{{- end -}}
{{- end -}}

{{/*
Security context for maestro containers
*/}}
{{- define "maestro.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
capabilities:
  drop:
    - ALL
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/*
Pod security context for maestro
*/}}
{{- define "maestro.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
fsGroup: 10001
fsGroupChangePolicy: "OnRootMismatch"
seccompProfile:
  type: RuntimeDefault
{{- end }}