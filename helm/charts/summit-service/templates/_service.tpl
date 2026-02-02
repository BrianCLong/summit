{{/* Deployment template for Summit services with optional blue/green */}}
{{- define "summit.service.deployment" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $color := .color | default "active" -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ printf "%s-%s" $svcName $color | trunc 63 | trimSuffix "-" }}
  labels:
    {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name "color" $color) | nindent 4 }}
  annotations:
    checksum/config: {{ toYaml $service | sha256sum }}
    {{- include "summit.service.podAnnotations" (dict "root" $root "service" $service) | nindent 4 }}
    {{- include "summit.service.meshAnnotations" (dict "root" $root "service" $service) | nindent 4 }}
spec:
  replicas: {{ $service.replicaCount | default 2 }}
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name "color" $color) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name "color" $color) | nindent 8 }}
      annotations:
        {{- if $service.serviceMesh }}
        traffic.sidecar.istio.io/includeOutboundIPRanges: {{ $service.serviceMesh.outboundCIDRs | default "*" | quote }}
        {{- end }}
        {{- include "summit.service.meshAnnotations" (dict "root" $root "service" $service) | nindent 8 }}
    spec:
      serviceAccountName: {{ default $root.Values.global.serviceAccount $service.serviceAccount | default "default" }}
      containers:
        - name: {{ $name }}
          image: {{ $service.image.repository }}:{{ $service.image.tag | default $root.Values.global.imageTag | default "latest" }}
          imagePullPolicy: {{ $service.image.pullPolicy | default "IfNotPresent" }}
          ports:
            - name: http
              containerPort: {{ $service.service.port | default 80 }}
              protocol: TCP
          env:
            {{- range $key, $value := $service.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
            {{- range $service.secretRefs }}
            - name: {{ .name }}
              valueFrom:
                secretKeyRef:
                  name: {{ .secretName }}
                  key: {{ .key }}
            {{- end }}
          resources:
            {{- toYaml (default $root.Values.global.resources $service.resources) | nindent 12 }}
          livenessProbe:
            httpGet:
              path: {{ $service.probes.liveness.path | default "/healthz" }}
              port: http
            initialDelaySeconds: {{ $service.probes.liveness.initialDelaySeconds | default 10 }}
            periodSeconds: {{ $service.probes.liveness.periodSeconds | default 10 }}
          readinessProbe:
            httpGet:
              path: {{ $service.probes.readiness.path | default "/ready" }}
              port: http
            initialDelaySeconds: {{ $service.probes.readiness.initialDelaySeconds | default 5 }}
            periodSeconds: {{ $service.probes.readiness.periodSeconds | default 5 }}
          startupProbe:
            httpGet:
              path: {{ $service.probes.startup.path | default "/startup" }}
              port: http
            failureThreshold: {{ $service.probes.startup.failureThreshold | default 30 }}
            periodSeconds: {{ $service.probes.startup.periodSeconds | default 5 }}
          volumeMounts:
            {{- range $service.volumeMounts }}
            - name: {{ .name }}
              mountPath: {{ .mountPath }}
              readOnly: {{ .readOnly | default true }}
            {{- end }}
      volumes:
        {{- range $service.secretVolumes }}
        - name: {{ .name }}
          secret:
            secretName: {{ .secretName }}
        {{- end }}
{{- end -}}

{{/* Service for active color */}}
{{- define "summit.service.service" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ $svcName }}
  labels:
    {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name) | nindent 4 }}
spec:
  type: {{ $service.service.type | default "ClusterIP" }}
  selector:
    {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name "color" ($service.blueGreen.activeColor | default "blue") ) | nindent 4 }}
  ports:
    - name: http
      port: {{ $service.service.port | default 80 }}
      targetPort: http
{{- end -}}

{{/* Color specific service to target pods directly */}}
{{- define "summit.service.colorService" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $color := .color -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ printf "%s-%s" $svcName $color | trunc 63 | trimSuffix "-" }}
  labels:
    {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name "color" $color) | nindent 4 }}
spec:
  type: ClusterIP
  selector:
    {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name "color" $color) | nindent 4 }}
  ports:
    - name: http
      port: {{ $service.service.port | default 80 }}
      targetPort: http
{{- end -}}

{{/* HorizontalPodAutoscaler */}}
{{- define "summit.service.hpa" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ $svcName }}
  labels:
    {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name) | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ printf "%s-%s" $svcName ($service.blueGreen.activeColor | default "blue") | trunc 63 | trimSuffix "-" }}
  minReplicas: {{ $service.hpa.minReplicas | default 2 }}
  maxReplicas: {{ $service.hpa.maxReplicas | default 5 }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ $service.hpa.cpuUtilization | default 70 }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ $service.hpa.memoryUtilization | default 80 }}
    {{- range $service.hpa.customMetrics }}
    - type: Pods
      pods:
        metric:
          name: {{ .name }}
        target:
          type: AverageValue
          averageValue: {{ .target }}
    {{- end }}
{{- end -}}

{{/* Ingress with TLS and mesh annotations */}}
{{- define "summit.service.ingress" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
{{- if $service.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ $svcName }}
  annotations:
    kubernetes.io/ingress.class: {{ $service.ingress.className | default "nginx" }}
    cert-manager.io/cluster-issuer: {{ $service.ingress.clusterIssuer | default $root.Values.global.ingress.clusterIssuer | default "letsencrypt-prod" }}
    {{- range $k, $v := $service.ingress.annotations }}
    {{ $k }}: {{ $v | quote }}
    {{- end }}
spec:
  tls:
    - hosts:
        {{- range $service.ingress.hosts }}
        - {{ .host }}
        {{- end }}
      secretName: {{ $service.ingress.tlsSecret | default (printf "%s-tls" $svcName) }}
  rules:
    {{- range $service.ingress.hosts }}
    - host: {{ .host }}
      http:
        paths:
          - path: {{ .path | default "/" }}
            pathType: Prefix
            backend:
              service:
                name: {{ $svcName }}
                port:
                  number: {{ $service.service.port | default 80 }}
    {{- end }}
{{- end }}
{{- end -}}

{{/* ExternalSecret wiring */}}
{{- define "summit.service.externalsecret" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
{{- if and $root.Values.global.secretStoreRef $service.externalSecrets.enabled }}
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ $svcName }}
  labels:
    {{- include "summit.service.labels" (dict "root" $root "service" $service "name" $name) | nindent 4 }}
spec:
  refreshInterval: {{ $service.externalSecrets.refreshInterval | default "1h" }}
  secretStoreRef:
    name: {{ $root.Values.global.secretStoreRef.name }}
    kind: {{ $root.Values.global.secretStoreRef.kind | default "ClusterSecretStore" }}
  target:
    name: {{ $svcName }}
  data:
    {{- range $service.externalSecrets.keys }}
    - secretKey: {{ .name }}
      remoteRef:
        key: {{ .remoteKey }}
        property: {{ .property | default "" }}
    {{- end }}
{{- end }}
{{- end -}}

{{/* NetworkPolicies */}}
{{- define "summit.service.networkPolicies" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ printf "%s-ingress" $svcName | trunc 63 | trimSuffix "-" }}
spec:
  podSelector:
    matchLabels:
      {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name) | nindent 6 }}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              istio-injection: enabled
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: summit
      ports:
        - protocol: TCP
          port: {{ $service.service.port | default 80 }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ printf "%s-egress" $svcName | trunc 63 | trimSuffix "-" }}
spec:
  podSelector:
    matchLabels:
      {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name) | nindent 6 }}
  policyTypes:
    - Egress
  egress:
    - to:
        {{- $cidrs := $service.networkPolicy.egressCIDRs | default (list "0.0.0.0/0") }}
        {{- range $cidrs }}
        - ipBlock:
            cidr: {{ . }}
        {{- end }}
      ports:
        - protocol: TCP
          port: 443
{{- end -}}

{{/* DestinationRule for mesh subsets */}}
{{- define "summit.service.destinationRule" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: {{ $svcName }}
spec:
  host: {{ $svcName }}
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
    - name: blue
      labels:
        app.kubernetes.io/version-color: blue
    - name: green
      labels:
        app.kubernetes.io/version-color: green
{{- end -}}

{{/* PeerAuthentication to enforce mTLS */}}
{{- define "summit.service.peerAuth" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: {{ $svcName }}
spec:
  selector:
    matchLabels:
      {{- include "summit.service.selector" (dict "root" $root "service" $service "name" $name) | nindent 6 }}
  mtls:
    mode: STRICT
{{- end -}}

{{/* Promotion job for blue/green */}}
{{- define "summit.service.promotionJob" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{- $service := .service -}}
{{- $svcName := include "summit.service.fullname" (dict "root" $root "service" $service "name" $name) -}}
{{- if $service.blueGreen.enabled }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ printf "%s-promote" $svcName | trunc 63 | trimSuffix "-" }}
  annotations:
    "helm.sh/hook": post-upgrade,post-install
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: promote
          image: bitnami/kubectl:1.29
          command:
            - /bin/sh
            - -c
            - |
              kubectl -n {{ $root.Release.Namespace }} patch service {{ $svcName }} \
                -p '{"spec":{"selector":{"app.kubernetes.io/version-color":"{{ $service.blueGreen.targetColor | default "green" }}"}}}'
{{- end }}
{{- end -}}
