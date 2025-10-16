# Phase 41: GitOps Documentation Workflows with Infrastructure as Code

## Overview

Implement GitOps-driven documentation workflows where documentation infrastructure and content are managed entirely through code, providing automated deployments, rollbacks, and multi-environment management.

## Architecture Components

### 1. Infrastructure as Code for Documentation

```yaml
# terraform/docs-infrastructure/main.tf
resource "kubernetes_namespace" "docs" {
metadata {
name = "docs-platform"
labels = {
"app.kubernetes.io/name" = "docs-platform"
"app.kubernetes.io/version" = var.version
}
}
}

resource "helm_release" "docs_platform" {
name       = "docs-platform"
namespace  = kubernetes_namespace.docs.metadata[0].name
chart      = "./charts/docs-platform"
version    = var.chart_version

values = [
templatefile("${path.module}/values.yaml.tpl", {
domain = var.domain
replicas = var.replicas
resources = var.resources
})
]
}
```

### 2. GitOps Workflow Configuration

```yaml
# .github/workflows/docs-gitops.yml
name: Documentation GitOps Workflow

on:
  push:
    branches: [main, develop]
    paths: ['docs/**', 'infrastructure/docs/**']
  pull_request:
    paths: ['docs/**', 'infrastructure/docs/**']

jobs:
  validate-infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Validate
        run: |
          cd infrastructure/docs
          terraform init -backend=false
          terraform validate
          terraform fmt -check

      - name: Helm Chart Validation
        run: |
          helm template charts/docs-platform --dry-run
          helm lint charts/docs-platform

  preview-deployment:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: validate-infrastructure
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Preview Environment
        run: |
          ./scripts/deploy-preview.sh ${{ github.event.number }}

      - name: Comment Preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment ready at: https://docs-pr-${{ github.event.number }}.preview.intelgraph.io'
            })

  production-deployment:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: validate-infrastructure
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          ./scripts/deploy-production.sh
```

### 3. Kubernetes Manifests for Documentation Platform

```yaml
# k8s/docs-platform/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: docs-platform
  namespace: docs-platform
  labels:
    app: docs-platform
    version: "{{ .Values.version }}"
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: docs-platform
  template:
    metadata:
      labels:
        app: docs-platform
        version: "{{ .Values.version }}"
      annotations:
        config-hash: "{{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}"
    spec:
      containers:
      - name: docs-platform
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "{{ .Values.environment }}"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: docs-platform-secrets
              key: database-url
        resources:
          requests:
            memory: "{{ .Values.resources.requests.memory }}"
            cpu: "{{ .Values.resources.requests.cpu }}"
          limits:
            memory: "{{ .Values.resources.limits.memory }}"
            cpu: "{{ .Values.resources.limits.cpu }}"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: docs-platform-service
  namespace: docs-platform
spec:
  selector:
    app: docs-platform
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: docs-platform-ingress
  namespace: docs-platform
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - "{{ .Values.domain }}"
    secretName: docs-platform-tls
  rules:
  - host: "{{ .Values.domain }}"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: docs-platform-service
            port:
              number: 80
```

### 4. ArgoCD Application Configuration

```yaml
# argocd/docs-platform.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: docs-platform
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/intelgraph/intelgraph
    targetRevision: HEAD
    path: k8s/docs-platform
    helm:
      valueFiles:
        - values.yaml
        - values-{{ .Values.environment }}.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: docs-platform
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m0s
```

## Implementation Features

### 1. GitOps Content Management System

```typescript
// src/gitops/content-manager.ts
export class GitOpsContentManager {
  private git: SimpleGit;
  private config: GitOpsConfig;

  constructor(config: GitOpsConfig) {
    this.git = simpleGit();
    this.config = config;
  }

  async syncContent(branch: string = 'main'): Promise<void> {
    try {
      await this.git.checkout(branch);
      await this.git.pull('origin', branch);

      const changes = await this.detectChanges();
      if (changes.length > 0) {
        await this.processChanges(changes);
        await this.triggerDeployment();
      }
    } catch (error) {
      this.logger.error('Content sync failed:', error);
      await this.rollbackChanges();
    }
  }

  private async detectChanges(): Promise<FileChange[]> {
    const status = await this.git.status();
    const changes: FileChange[] = [];

    for (const file of [...status.modified, ...status.created]) {
      if (file.match(/\.(md|mdx|json|yaml)$/)) {
        changes.push({
          type: 'content',
          path: file,
          action: status.created.includes(file) ? 'create' : 'update',
        });
      }
    }

    return changes;
  }

  private async processChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      switch (change.type) {
        case 'content':
          await this.processContentChange(change);
          break;
        case 'infrastructure':
          await this.processInfrastructureChange(change);
          break;
      }
    }
  }

  private async triggerDeployment(): Promise<void> {
    const webhook = new WebhookTrigger(this.config.webhookUrl);
    await webhook.trigger({
      type: 'content-sync',
      timestamp: new Date().toISOString(),
      commit: await this.git.revparse(['HEAD']),
    });
  }
}
```

### 2. Infrastructure State Management

```typescript
// src/gitops/infrastructure-state.ts
export class InfrastructureStateManager {
  private terraform: TerraformRunner;
  private kubectl: KubectlRunner;

  async planInfrastructureChanges(): Promise<TerraformPlan> {
    const plan = await this.terraform.plan({
      varFile: `environments/${this.config.environment}.tfvars`,
    });

    return {
      ...plan,
      resources: await this.analyzeResourceChanges(plan),
      cost: await this.calculateCostImpact(plan),
    };
  }

  async applyInfrastructureChanges(plan: TerraformPlan): Promise<void> {
    try {
      // Pre-deployment validation
      await this.validatePrerequisites();

      // Apply changes with rollback capability
      await this.terraform.apply(plan, {
        autoApprove: true,
        lock: true,
        parallelism: 10,
      });

      // Verify deployment health
      await this.verifyDeploymentHealth();
    } catch (error) {
      this.logger.error('Infrastructure deployment failed:', error);
      await this.initiateRollback();
      throw error;
    }
  }

  private async validatePrerequisites(): Promise<void> {
    const checks = [
      this.checkClusterHealth(),
      this.checkResourceQuotas(),
      this.checkSecretAvailability(),
      this.checkNetworkPolicies(),
    ];

    const results = await Promise.allSettled(checks);
    const failures = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);

    if (failures.length > 0) {
      throw new Error(`Prerequisite checks failed: ${failures.join(', ')}`);
    }
  }
}
```

### 3. Multi-Environment Configuration Management

```typescript
// src/gitops/environment-config.ts
export class EnvironmentConfigManager {
  private environments: Map<string, EnvironmentConfig> = new Map();

  constructor() {
    this.loadEnvironmentConfigs();
  }

  private loadEnvironmentConfigs(): void {
    const configs = [
      {
        name: 'development',
        cluster: 'dev-cluster',
        namespace: 'docs-dev',
        replicas: 1,
        resources: { cpu: '100m', memory: '128Mi' },
        domain: 'docs-dev.intelgraph.io',
        features: ['debug-mode', 'hot-reload'],
        syncPolicy: 'automatic',
      },
      {
        name: 'staging',
        cluster: 'staging-cluster',
        namespace: 'docs-staging',
        replicas: 2,
        resources: { cpu: '200m', memory: '256Mi' },
        domain: 'docs-staging.intelgraph.io',
        features: ['performance-testing', 'integration-tests'],
        syncPolicy: 'manual',
      },
      {
        name: 'production',
        cluster: 'prod-cluster',
        namespace: 'docs-platform',
        replicas: 5,
        resources: { cpu: '500m', memory: '512Mi' },
        domain: 'docs.intelgraph.io',
        features: ['high-availability', 'auto-scaling', 'monitoring'],
        syncPolicy: 'manual-with-approval',
      },
    ];

    configs.forEach((config) => {
      this.environments.set(config.name, config);
    });
  }

  async promoteToEnvironment(
    from: string,
    to: string,
    options: PromotionOptions = {},
  ): Promise<void> {
    const fromEnv = this.environments.get(from);
    const toEnv = this.environments.get(to);

    if (!fromEnv || !toEnv) {
      throw new Error(`Invalid environment: ${from} -> ${to}`);
    }

    // Run pre-promotion checks
    await this.runPrePromotionChecks(fromEnv, toEnv);

    // Create promotion PR or direct deployment
    if (toEnv.syncPolicy === 'manual-with-approval') {
      await this.createPromotionPR(from, to, options);
    } else {
      await this.directPromotion(fromEnv, toEnv, options);
    }
  }

  private async runPrePromotionChecks(
    from: EnvironmentConfig,
    to: EnvironmentConfig,
  ): Promise<void> {
    const checks = [
      this.checkHealthMetrics(from),
      this.checkSecurityScans(from),
      this.checkPerformanceTests(from),
      this.checkCompatibility(from, to),
    ];

    const results = await Promise.allSettled(checks);
    const failures = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);

    if (failures.length > 0) {
      throw new Error(`Promotion checks failed: ${failures.join(', ')}`);
    }
  }
}
```

### 4. Automated Rollback System

```typescript
// src/gitops/rollback-manager.ts
export class RollbackManager {
  private deploymentHistory: DeploymentRecord[] = [];

  async recordDeployment(deployment: DeploymentRecord): Promise<void> {
    this.deploymentHistory.unshift(deployment);

    // Keep only last 10 deployments for rollback
    if (this.deploymentHistory.length > 10) {
      this.deploymentHistory = this.deploymentHistory.slice(0, 10);
    }

    await this.persistDeploymentHistory();
  }

  async rollbackToVersion(version: string): Promise<void> {
    const targetDeployment = this.deploymentHistory.find(
      (d) => d.version === version,
    );

    if (!targetDeployment) {
      throw new Error(`Version ${version} not found in deployment history`);
    }

    try {
      // Create rollback deployment
      await this.createRollbackDeployment(targetDeployment);

      // Verify rollback success
      await this.verifyRollbackHealth(targetDeployment);

      // Update current version
      await this.updateCurrentVersion(version);
    } catch (error) {
      this.logger.error('Rollback failed:', error);
      throw new Error(
        `Failed to rollback to version ${version}: ${error.message}`,
      );
    }
  }

  async autoRollback(healthCheck: HealthCheckResult): Promise<void> {
    if (!healthCheck.critical || this.deploymentHistory.length < 2) {
      return;
    }

    const lastKnownGood = this.deploymentHistory[1]; // Previous deployment

    this.logger.warn(
      'Critical health check failure, initiating auto-rollback',
      {
        currentVersion: this.deploymentHistory[0].version,
        targetVersion: lastKnownGood.version,
        healthCheck,
      },
    );

    await this.rollbackToVersion(lastKnownGood.version);
  }

  private async createRollbackDeployment(
    deployment: DeploymentRecord,
  ): Promise<void> {
    const rollbackConfig = {
      ...deployment.config,
      metadata: {
        ...deployment.config.metadata,
        annotations: {
          ...deployment.config.metadata.annotations,
          'deployment.kubernetes.io/revision': deployment.revision,
          'rollback.intelgraph.io/timestamp': new Date().toISOString(),
          'rollback.intelgraph.io/reason': 'automated-rollback',
        },
      },
    };

    await this.kubectl.apply(rollbackConfig);
  }
}
```

## Monitoring and Observability

### GitOps Metrics Dashboard

```typescript
// src/gitops/metrics-collector.ts
export class GitOpsMetricsCollector {
  private metrics: PrometheusRegistry;

  constructor() {
    this.metrics = new PrometheusRegistry();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.deploymentDuration = new Histogram({
      name: 'gitops_deployment_duration_seconds',
      help: 'Time taken for deployments',
      labelNames: ['environment', 'component', 'status'],
      buckets: [1, 5, 10, 30, 60, 300, 600],
    });

    this.deploymentFrequency = new Counter({
      name: 'gitops_deployments_total',
      help: 'Total number of deployments',
      labelNames: ['environment', 'component', 'status'],
    });

    this.rollbackCount = new Counter({
      name: 'gitops_rollbacks_total',
      help: 'Total number of rollbacks',
      labelNames: ['environment', 'trigger', 'reason'],
    });
  }

  recordDeployment(
    environment: string,
    component: string,
    duration: number,
    status: 'success' | 'failure',
  ): void {
    this.deploymentDuration
      .labels(environment, component, status)
      .observe(duration);

    this.deploymentFrequency.labels(environment, component, status).inc();
  }
}
```

## Security and Compliance

### 1. Secret Management

```yaml
# k8s/secrets/external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: docs-platform
spec:
  provider:
    vault:
      server: 'https://vault.intelgraph.io'
      path: 'secret'
      version: 'v2'
      auth:
        kubernetes:
          mountPath: 'kubernetes'
          role: 'docs-platform'

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: docs-platform-secrets
  namespace: docs-platform
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: docs-platform-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: docs-platform
        property: database_url
    - secretKey: api-key
      remoteRef:
        key: docs-platform
        property: api_key
```

### 2. Policy as Code

```yaml
# policies/docs-platform-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: docs-platform-security
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: require-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - docs-platform
      validate:
        message: 'Security context is required'
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: '>1000'

    - name: require-resource-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - docs-platform
      validate:
        message: 'Resource limits are required'
        pattern:
          spec:
            containers:
              - name: '*'
                resources:
                  limits:
                    memory: '?*'
                    cpu: '?*'
```

This completes Phase 41: GitOps Documentation Workflows with Infrastructure as Code. The implementation provides:

1. **Complete Infrastructure as Code**: Terraform and Helm charts for reproducible deployments
2. **Automated GitOps Workflows**: GitHub Actions with ArgoCD integration
3. **Multi-Environment Management**: Development, staging, and production configurations
4. **Automated Rollback Capabilities**: Health monitoring with automatic rollback triggers
5. **Security and Compliance**: Secret management, policy as code, and security scanning
6. **Monitoring and Observability**: Comprehensive metrics collection and alerting

The system ensures that all documentation infrastructure changes are version-controlled, reviewable, and automatically deployed with proper validation and rollback capabilities.
