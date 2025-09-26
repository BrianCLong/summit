{{/*
Expand the name of the chart.
*/}}
{{- define "intelgraph.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "intelgraph.fullname" -}}
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
{{- define "intelgraph.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "intelgraph.labels" -}}
helm.sh/chart: {{ include "intelgraph.chart" . }}
{{ include "intelgraph.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: intelgraph
{{- end }}

{{/*
Selector labels
*/}}
{{- define "intelgraph.selectorLabels" -}}
app.kubernetes.io/name: {{ include "intelgraph.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service labels for a specific service
*/}}
{{- define "intelgraph.serviceLabels" -}}
{{- $serviceName := .serviceName -}}
helm.sh/chart: {{ include "intelgraph.chart" .root }}
app.kubernetes.io/name: {{ $serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- if .root.Chart.AppVersion }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/part-of: intelgraph
app.kubernetes.io/component: {{ $serviceName }}
{{- end }}

{{/*
Service selector labels
*/}}
{{- define "intelgraph.serviceSelectorLabels" -}}
{{- $serviceName := .serviceName -}}
app.kubernetes.io/name: {{ $serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "intelgraph.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "intelgraph.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image name helper
*/}}
{{- define "intelgraph.image" -}}
{{- $service := .service -}}
{{- $root := .root -}}
{{- printf "%s/%s:%s" $root.Values.global.imageRegistry $service.image $root.Values.global.tag }}
{{- end }}

{{/*
Common environment variables
*/}}
{{- define "intelgraph.commonEnv" -}}
{{- range .Values.common.env }}
- name: {{ .name }}
  {{- if .value }}
  value: {{ tpl .value . | quote }}
  {{- else if .valueFrom }}
  valueFrom: {{- toYaml .valueFrom | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Service-specific environment variables
*/}}
{{- define "intelgraph.serviceEnv" -}}
{{- $service := .service -}}
{{- $root := .root -}}
{{- range $service.env }}
- name: {{ .name }}
  {{- if .value }}
  value: {{ tpl .value $root | quote }}
  {{- else if .valueFrom }}
  valueFrom: {{- toYaml .valueFrom | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Security context
*/}}
{{- define "intelgraph.securityContext" -}}
{{- toYaml .Values.global.securityContext }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "intelgraph.podSecurityContext" -}}
{{- toYaml .Values.global.podSecurityContext }}
{{- end }}

{{/*
Resource limits
*/}}
{{- define "intelgraph.resources" -}}
{{- $service := .service -}}
{{- if $service.resources }}
{{- toYaml $service.resources }}
{{- else }}
{{- toYaml .root.Values.common.resources }}
{{- end }}
{{- end }}

{{/*
Liveness probe
*/}}
{{- define "intelgraph.livenessProbe" -}}
{{- $service := .service -}}
{{- $probe := $service.livenessProbe | default .root.Values.common.livenessProbe -}}
httpGet:
  path: {{ $probe.httpGet.path }}
  port: {{ $probe.httpGet.port }}
  scheme: HTTP
initialDelaySeconds: {{ $probe.initialDelaySeconds }}
periodSeconds: {{ $probe.periodSeconds }}
timeoutSeconds: {{ $probe.timeoutSeconds }}
failureThreshold: {{ $probe.failureThreshold }}
{{- end }}

{{/*
Readiness probe
*/}}
{{- define "intelgraph.readinessProbe" -}}
{{- $service := .service -}}
{{- $probe := $service.readinessProbe | default .root.Values.common.readinessProbe -}}
httpGet:
  path: {{ $probe.httpGet.path }}
  port: {{ $probe.httpGet.port }}
  scheme: HTTP
initialDelaySeconds: {{ $probe.initialDelaySeconds }}
periodSeconds: {{ $probe.periodSeconds }}
timeoutSeconds: {{ $probe.timeoutSeconds }}
failureThreshold: {{ $probe.failureThreshold }}
{{- end }}

{{/*
Volume mounts
*/}}
{{- define "intelgraph.volumeMounts" -}}
{{- toYaml .Values.common.volumeMounts }}
{{- end }}

{{/*
Volumes
*/}}
{{- define "intelgraph.volumes" -}}
{{- toYaml .Values.common.volumes }}
{{- end }}

{{/*
Compute whether a pod should automount the service account token.
*/}}
{{- define "intelgraph.automountServiceAccountToken" -}}
{{- $root := .root -}}
{{- $service := .service -}}
{{- $automount := default false $root.Values.common.automountServiceAccountToken -}}
{{- if hasKey $service "automountServiceAccountToken" }}
{{- $automount = $service.automountServiceAccountToken -}}
{{- end }}
{{- $vault := default dict $root.Values.global.vault -}}
{{- if $vault.enabled -}}
{{- $serviceVault := default dict $service.vault -}}
{{- $vaultEnabled := $vault.enabled -}}
{{- if hasKey $serviceVault "enabled" }}
{{- $vaultEnabled = $serviceVault.enabled -}}
{{- end }}
{{- if $vaultEnabled -}}
true
{{- else -}}
{{ ternary "true" "false" $automount }}
{{- end -}}
{{- else -}}
{{ ternary "true" "false" $automount }}
{{- end }}
{{- end }}

{{/*
Vault agent injector annotations
*/}}
{{- define "intelgraph.vaultAnnotations" -}}
{{- $root := .root -}}
{{- $service := .service -}}
{{- $vault := default dict $root.Values.global.vault -}}
{{- $serviceVault := default dict $service.vault -}}
{{- $enabled := false -}}
{{- if $vault.enabled -}}
{{- $enabled = true -}}
{{- end -}}
{{- if hasKey $serviceVault "enabled" }}
{{- $enabled = $serviceVault.enabled -}}
{{- end }}
{{- if $enabled }}
{{- $role := default $vault.role $serviceVault.role -}}
vault.hashicorp.com/agent-inject: "true"
{{- if $role }}
vault.hashicorp.com/role: {{ $role | quote }}
{{- end }}
{{- $address := default $vault.address $serviceVault.address -}}
{{- if $address }}
vault.hashicorp.com/agent-inject-vault-address: {{ tpl $address $root | quote }}
{{- end }}
{{- $prepopulate := true -}}
{{- if hasKey $vault "prePopulateOnly" }}
{{- $prepopulate = $vault.prePopulateOnly -}}
{{- end }}
{{- if hasKey $serviceVault "prePopulateOnly" }}
{{- $prepopulate = $serviceVault.prePopulateOnly -}}
{{- end }}
vault.hashicorp.com/agent-pre-populate-only: {{ ternary "true" "false" $prepopulate | quote }}
{{- $configMap := default $vault.agentConfigMap $serviceVault.agentConfigMap -}}
{{- if $configMap }}
vault.hashicorp.com/agent-configmap: {{ $configMap | quote }}
{{- end }}
{{- $secrets := $vault.secrets | default (list) -}}
{{- if $serviceVault.secrets }}
{{- $secrets = $serviceVault.secrets -}}
{{- end }}
{{- range $secret := $secrets }}
{{- $name := default $secret.name $secret.file -}}
{{- if $name }}
vault.hashicorp.com/agent-inject-secret-{{ $name }}: {{ tpl $secret.path $root | quote }}
{{- if $secret.destination }}
vault.hashicorp.com/agent-inject-file-{{ $name }}: {{ $secret.destination | quote }}
{{- end }}
{{- if $secret.template }}
vault.hashicorp.com/agent-inject-template-{{ $name }}: |
{{ tpl $secret.template $root | nindent 2 }}
{{- end }}
{{- end }}
{{- end }}
{{- $command := default $vault.command $serviceVault.command -}}
{{- if $command }}
vault.hashicorp.com/agent-inject-command: {{ tpl $command $root | quote }}
{{- end }}
{{- $combined := dict -}}
{{- if $vault.extraAnnotations }}
{{- $combined = merge $combined $vault.extraAnnotations }}
{{- end }}
{{- if $serviceVault.extraAnnotations }}
{{- $combined = merge $combined $serviceVault.extraAnnotations }}
{{- end }}
{{- range $key, $value := $combined }}
{{ $key }}: {{ tpl $value $root | quote }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Pod annotations
*/}}
{{- define "intelgraph.podAnnotations" -}}
{{- $service := .service -}}
{{- $annotations := .root.Values.common.podAnnotations -}}
{{- if $service.podAnnotations }}
{{- $annotations = merge $annotations $service.podAnnotations }}
{{- end }}
{{- range $key, $value := $annotations }}
{{ $key }}: {{ tpl $value $.root | quote }}
{{- end }}
{{- end }}

{{/*
Pod labels
*/}}
{{- define "intelgraph.podLabels" -}}
{{- $service := .service -}}
{{- $labels := .root.Values.common.podLabels -}}
{{- if $service.podLabels }}
{{- $labels = merge $labels $service.podLabels }}
{{- end }}
{{- range $key, $value := $labels }}
{{ $key }}: {{ tpl $value $.root | quote }}
{{- end }}
{{- end }}

{{/*
Checksum for config changes
*/}}
{{- define "intelgraph.configChecksum" -}}
checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
{{- end }}