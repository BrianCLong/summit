{{/*
Helm Security Template — IntelGraph v5.0.0
Container hardening defaults for all workloads.

Usage in deployment templates:
  securityContext:
    {{- include "summit.podSecurityContext" . | nindent 8 }}
  containers:
    - name: ...
      securityContext:
        {{- include "summit.containerSecurityContext" . | nindent 12 }}
      resources:
        {{- include "summit.resourceDefaults" . | nindent 12 }}
*/}}

{{/*
Pod-level security context (applies to all containers in the pod).
Enforces non-root, read-only filesystem, seccomp, and no privilege escalation.
*/}}
{{- define "summit.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: 1001
runAsGroup: 1001
fsGroup: 1001
seccompProfile:
  type: RuntimeDefault
{{- end -}}

{{/*
Container-level security context.
Drops all capabilities; adds only NET_BIND_SERVICE if needed for ports < 1024.
*/}}
{{- define "summit.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsNonRoot: true
runAsUser: 1001
capabilities:
  drop:
    - ALL
{{- end -}}

{{/*
Container security context for services that need to bind low ports.
*/}}
{{- define "summit.containerSecurityContextWithBind" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsNonRoot: true
runAsUser: 1001
capabilities:
  drop:
    - ALL
  add:
    - NET_BIND_SERVICE
{{- end -}}

{{/*
Default resource requests and limits.
Override per-service via values.yaml: .Values.<service>.resources
*/}}
{{- define "summit.resourceDefaults" -}}
requests:
  cpu: 100m
  memory: 128Mi
limits:
  cpu: "1"
  memory: 512Mi
{{- end -}}

{{/*
Standard volume mounts for writable directories (since rootFS is read-only).
*/}}
{{- define "summit.writableVolumeMounts" -}}
- name: tmp
  mountPath: /tmp
- name: cache
  mountPath: /app/.cache
{{- end -}}

{{/*
Standard volumes for writable directories.
*/}}
{{- define "summit.writableVolumes" -}}
- name: tmp
  emptyDir:
    sizeLimit: 100Mi
- name: cache
  emptyDir:
    sizeLimit: 200Mi
{{- end -}}

{{/*
Network policy: deny all ingress by default, allow only labeled sources.
Usage: {{- include "summit.networkPolicyDefault" (dict "appLabel" "summit-api" "namespace" .Release.Namespace) }}
*/}}
{{- define "summit.networkPolicyDefault" -}}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .appLabel }}-default-deny
  namespace: {{ .namespace }}
spec:
  podSelector:
    matchLabels:
      app: {{ .appLabel }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              network-access/{{ .appLabel }}: "true"
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    - to:
        - podSelector: {}
{{- end -}}

{{/*
Image reference with digest pinning.
Usage: image: {{- include "summit.image" (dict "repo" "ghcr.io/brianclong/summit/api" "tag" .Values.image.tag "digest" .Values.image.digest) }}
*/}}
{{- define "summit.image" -}}
{{- if .digest -}}
{{ .repo }}@{{ .digest }}
{{- else -}}
{{ .repo }}:{{ .tag | default "latest" }}
{{- end -}}
{{- end -}}

{{/*
Standard labels for all resources.
*/}}
{{- define "summit.standardLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/part-of: summit
app.kubernetes.io/version: {{ .version | default "5.0.0" }}
app.kubernetes.io/managed-by: helm
{{- end -}}

{{/*
Pod disruption budget template.
Usage: {{- include "summit.pdb" (dict "name" "summit-api" "minAvailable" "50%") }}
*/}}
{{- define "summit.pdb" -}}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ .name }}-pdb
spec:
  minAvailable: {{ .minAvailable | default "50%" }}
  selector:
    matchLabels:
      app: {{ .name }}
{{- end -}}
