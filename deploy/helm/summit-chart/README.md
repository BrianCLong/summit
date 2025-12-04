# Summit IntelGraph Platform Helm Chart

This Helm chart deploys the Summit IntelGraph Platform (Backend and Frontend) to a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+

## Installing the Chart

To install the chart with the release name `summit`:

```bash
helm install summit ./summit-chart
```

## Uninstalling the Chart

To uninstall/delete the `summit` deployment:

```bash
helm uninstall summit
```

## Configuration

The following table lists the configurable parameters of the Summit chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `summit/app` |
| `image.tag` | Image tag | `""` (Chart AppVersion) |
| `service.backendPort` | Backend service port | `3000` |
| `service.frontendPort` | Frontend service port | `8000` |
| `resources` | CPU/Memory resource requests/limits | See values.yaml |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example:

```bash
helm install summit ./summit-chart --set replicaCount=2
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example:

```bash
helm install summit ./summit-chart -f values.yaml
```
