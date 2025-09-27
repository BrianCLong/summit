# prettier-ignore-start
{{- if .Values.connectorsWorker.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "intelgraph.fullname" . }}-connectors-worker
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
    app.kubernetes.io/component: connectors-worker
spec:
  replicas: {{ .Values.connectorsWorker.replicas }}
  selector:
    matchLabels:
      {{- include "intelgraph.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: connectors-worker
  template:
    metadata:
      labels:
        {{- include "intelgraph.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: connectors-worker
    spec:
      serviceAccountName: {{ default (include "intelgraph.serviceAccountName" .) .Values.connectorsWorker.serviceAccountName }}
      containers:
        - name: worker
          image: {{ .Values.connectorsWorker.image.repository }}:{{ .Values.connectorsWorker.image.tag }}
          imagePullPolicy: {{ .Values.connectorsWorker.image.pullPolicy }}
          {{- if .Values.connectorsWorker.env }}
          env:
            {{- range $key, $value := .Values.connectorsWorker.env }}
            - name: {{ $key }}
              value: "{{ $value }}"
            {{- end }}
          {{- end }}
          {{- with .Values.connectorsWorker.envFrom }}
          envFrom:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          args:
            - "--workers={{ .Values.connectorsWorker.workerCount }}"
            - "--chunk-size={{ .Values.connectorsWorker.s3.chunkSize }}"
            - "--prefix={{ .Values.connectorsWorker.s3.prefix }}"
            - "--bucket={{ .Values.connectorsWorker.s3.bucket }}"
          resources:
            {{- toYaml .Values.connectorsWorker.resources | nindent 12 }}
          ports:
            - name: metrics
              containerPort: 9090
          {{- with .Values.connectorsWorker.volumeMounts }}
          volumeMounts:
            {{- toYaml . | nindent 12 }}
          {{- end }}
      {{- with .Values.connectorsWorker.volumes }}
      volumes:
        {{- toYaml . | nindent 8 }}
      {{- end }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ include "intelgraph.fullname" . }}-connectors-worker
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
    app.kubernetes.io/component: connectors-worker
spec:
  selector:
    {{- include "intelgraph.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: connectors-worker
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "intelgraph.fullname" . }}-connectors-worker
  labels:
    {{- include "intelgraph.labels" . | nindent 4 }}
    app.kubernetes.io/component: connectors-worker
spec:
  selector:
    matchLabels:
      {{- include "intelgraph.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: connectors-worker
  endpoints:
    - port: metrics
      interval: 15s
{{- end }}
# prettier-ignore-end
