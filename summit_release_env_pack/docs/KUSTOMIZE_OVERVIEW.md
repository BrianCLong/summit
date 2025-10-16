# Kustomize Overview

- `k8s/base`: core Deployment/Service with probes, resources, securityContext
- `k8s/overlays/{dev,staging,prod}`: replica counts + HPA
- Update ECR url+tag with the image you promoted.
