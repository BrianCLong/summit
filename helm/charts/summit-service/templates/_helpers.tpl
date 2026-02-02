{{- define "summit.service.fullname" -}}
{{- $name := default .name .service.name -}}
{{- printf "%s-%s" .root.Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "summit.service.labels" -}}
app.kubernetes.io/name: {{ default .name .service.name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/part-of: summit
{{- if .color }}
app.kubernetes.io/version-color: {{ .color }}
{{- end }}
{{- end -}}

{{- define "summit.service.selector" -}}
app.kubernetes.io/name: {{ default .name .service.name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- if .color }}
app.kubernetes.io/version-color: {{ .color }}
{{- end }}
{{- end -}}

{{- define "summit.service.podAnnotations" -}}
{{- $ann := merge (dict) (.root.Values.global.podAnnotations | default (dict)) (.service.podAnnotations | default (dict)) -}}
{{- if $ann }}
{{ toYaml $ann }}
{{- end -}}
{{- end -}}

{{- define "summit.service.meshAnnotations" -}}
{{- $ann := dict "sidecar.istio.io/inject" (ternary "true" "false" (hasKey .service "mesh")) }}
{{- if .root.Values.global.mesh.sidecar.enabled | default true }}
sidecar.istio.io/inject: "true"
{{- if .root.Values.global.mesh.sidecar.resources }}
sidecar.istio.io/proxyCPU: {{ .root.Values.global.mesh.sidecar.resources.requests.cpu | quote }}
sidecar.istio.io/proxyMemory: {{ .root.Values.global.mesh.sidecar.resources.requests.memory | quote }}
{{- end }}
{{- end }}
{{- if .service.mesh.sidecar }}
{{- if hasKey .service.mesh.sidecar "resources" }}
sidecar.istio.io/proxyCPU: {{ .service.mesh.sidecar.resources.requests.cpu | quote }}
sidecar.istio.io/proxyMemory: {{ .service.mesh.sidecar.resources.requests.memory | quote }}
{{- end }}
{{- end }}
{{- end -}}
