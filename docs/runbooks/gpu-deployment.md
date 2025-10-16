# GPU Deployment Runbook

## Prerequisites

- NVIDIA GPU drivers installed on nodes
- NVIDIA Container Toolkit
- Kubernetes cluster with GPU support

## Docker GPU Setup

### Local Development

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker daemon
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Start GPU-enabled services
docker compose -f docker-compose.gpu.yml up -d
```

## Kubernetes GPU Deployment

### AWS EKS with Terraform

```bash
cd deploy/terraform/environments/production
terraform init
terraform plan -var-file="gpu.tfvars"
terraform apply -var-file="gpu.tfvars"
```

### Manual K8s Deployment

```bash
# Install NVIDIA device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml

# Deploy IntelGraph with GPU support
kubectl apply -f deploy/k8s/ml-gpu.yaml

# Verify GPU resources
kubectl describe nodes -l accelerator=nvidia-tesla-k80
```

### Helm Deployment

```bash
helm upgrade --install intelgraph deploy/helm/intelgraph \
  -f deploy/helm/intelgraph/values-gpu.yaml \
  -n intelgraph --create-namespace
```

## Monitoring GPU Usage

### Node-level monitoring

```bash
# Check GPU utilization
nvidia-smi

# Monitor GPU pods
kubectl top pods -l component=ml-service --containers
```

### Application monitoring

```bash
# Check ML service logs
kubectl logs -l app=intelgraph-ml-gpu -f

# Monitor Celery workers
kubectl logs -l app=intelgraph-ml-worker-gpu -f
```

## Scaling GPU Workloads

### Manual scaling

```bash
# Scale ML service
kubectl scale deployment intelgraph-ml-gpu --replicas=2

# Scale workers
kubectl scale deployment intelgraph-ml-worker-gpu --replicas=4
```

### Auto-scaling

```bash
# Deploy HPA
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: intelgraph-ml-gpu-hpa
  namespace: intelgraph
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-ml-gpu
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: nvidia.com/gpu
      target:
        type: Utilization
        averageUtilization: 70
EOF
```

## Troubleshooting

### Common Issues

1. **GPU not detected**: Check NVIDIA drivers and device plugin
2. **Out of GPU memory**: Reduce model size or batch size
3. **Slow training**: Check GPU utilization and data loading

### Debug commands

```bash
# Check GPU availability in pod
kubectl exec -it <pod-name> -- nvidia-smi

# Check device plugin logs
kubectl logs -n kube-system -l name=nvidia-device-plugin-ds

# Verify GPU allocation
kubectl describe pod <ml-pod-name>
```
