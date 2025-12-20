{{- define "intelgraph.security.annotations" -}}
{{- if .Values.hardening.enabled }}
seccomp.security.alpha.kubernetes.io/pod: {{ default "RuntimeDefault" .Values.hardening.seccompProfile | quote }}
container.apparmor.security.beta.kubernetes.io/{{ .service.name }}: {{ default "runtime/default" .Values.hardening.apparmorProfile | quote }}
{{- end }}
{{- end }}

{{- define "intelgraph.security.podContext" -}}
{{- $ctx := . -}}
{{- if $ctx.Values.hardening.enabled }}
runAsNonRoot: true
runAsUser: {{ default 65532 $ctx.Values.hardening.runAsUser }}
runAsGroup: {{ default 65532 $ctx.Values.hardening.runAsGroup }}
fsGroup: {{ default 65532 $ctx.Values.hardening.fsGroup }}
seccompProfile:
  type: {{ default "RuntimeDefault" $ctx.Values.hardening.seccompProfile }}
{{- else }}
{{ toYaml $ctx.Values.global.podSecurityContext }}
{{- end }}
{{- end }}

{{- define "intelgraph.security.containerContext" -}}
{{- $ctx := . -}}
{{- if $ctx.Values.hardening.enabled }}
runAsNonRoot: true
runAsUser: {{ default 65532 $ctx.Values.hardening.runAsUser }}
runAsGroup: {{ default 65532 $ctx.Values.hardening.runAsGroup }}
readOnlyRootFilesystem: true
allowPrivilegeEscalation: false
capabilities:
  drop:
    - ALL
{{- if $ctx.Values.hardening.extraCapabilities }}
  add:
    {{- range $ctx.Values.hardening.extraCapabilities }}
    - {{ . }}
    {{- end }}
{{- end }}
{{- else }}
{{ toYaml $ctx.Values.global.securityContext }}
{{- end }}
{{- end }}
