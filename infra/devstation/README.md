# Cloud Dev Workstations

**Reproducible development environments for cloud and containerized workstations.**

This directory contains templates and configurations for deploying Summit dev environments in the cloud or as containers.

## Approaches

### 1. Dev Container (VS Code / GitHub Codespaces)

**Use case**: Consistent development environment across local and cloud (Codespaces)

**Status**: Placeholder - see below for starter template

**Benefits**:
- Works with VS Code Remote Containers
- Compatible with GitHub Codespaces
- Consistent environment across team
- No local installation required

**Next steps**:
1. Create `.devcontainer/devcontainer.json` in repo root (see template below)
2. Add `Dockerfile` for base image
3. Test locally with VS Code Remote Containers extension
4. Test on GitHub Codespaces

### 2. Cloud VM Image (Packer)

**Use case**: Pre-baked VM images for AWS EC2, GCP Compute Engine, Azure VMs

**Status**: Placeholder - see below for starter template

**Benefits**:
- Fast spin-up (pre-installed tools)
- Reproducible across cloud providers
- Can be shared across team
- Suitable for remote development servers

**Next steps**:
1. Create Packer template (see below)
2. Build image for target cloud (AWS AMI, GCP image, Azure VHD)
3. Launch VM from image
4. Access via SSH or VS Code Remote SSH

### 3. Cloud-Init (User Data)

**Use case**: Bootstrap standard Ubuntu VMs on first boot

**Status**: Example provided below

**Benefits**:
- Works with any cloud provider (AWS, GCP, Azure, DigitalOcean)
- No custom images needed
- Easy to update and version control

**Next steps**:
1. Use cloud-init YAML (see below)
2. Pass as user-data when launching VM
3. Wait for bootstrap to complete (~10-15 min on first boot)
4. Access via SSH

## Templates

### Dev Container (devcontainer.json)

**Location**: Create this file at `.devcontainer/devcontainer.json` in repo root

```json
{
  "name": "Summit Dev Container",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-22.04",

  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {
      "version": "1.29.0",
      "helm": "3.14.0"
    },
    "ghcr.io/devcontainers/features/terraform:1": {
      "version": "1.7.0"
    }
  },

  "postCreateCommand": "bash scripts/devstation/ubuntu/bootstrap.sh",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-azuretools.vscode-docker",
        "ms-kubernetes-tools.vscode-kubernetes-tools",
        "hashicorp.terraform",
        "GraphQL.vscode-graphql",
        "GitHub.copilot"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  },

  "forwardPorts": [3000, 4000, 5432, 6379, 7687],

  "remoteUser": "vscode",

  "mounts": [
    "source=${localEnv:HOME}/.ssh,target=/home/vscode/.ssh,type=bind,consistency=cached"
  ]
}
```

**Usage**:
1. Install "Dev Containers" extension in VS Code
2. Open repo in VS Code
3. Command Palette → "Dev Containers: Reopen in Container"
4. Wait for container to build and bootstrap to run

### Packer Template (AWS AMI)

**Location**: Create this file at `infra/devstation/packer/summit-devstation.pkr.hcl`

```hcl
# Packer template for Summit Dev Station AMI
# Usage: packer build summit-devstation.pkr.hcl

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.large"
}

source "amazon-ebs" "summit-devstation" {
  ami_name      = "summit-devstation-{{timestamp}}"
  instance_type = var.instance_type
  region        = var.aws_region

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"] # Canonical
  }

  ssh_username = "ubuntu"

  tags = {
    Name        = "Summit Dev Station"
    OS_Version  = "Ubuntu 22.04"
    Built_By    = "Packer"
    Environment = "Development"
  }
}

build {
  sources = ["source.amazon-ebs.summit-devstation"]

  # Wait for cloud-init to complete
  provisioner "shell" {
    inline = [
      "cloud-init status --wait"
    ]
  }

  # Run bootstrap script
  provisioner "file" {
    source      = "../../../scripts/devstation/ubuntu/"
    destination = "/tmp/devstation"
  }

  provisioner "shell" {
    inline = [
      "sudo INSTALL_K8S_TOOLS=1 INSTALL_CLOUD_TOOLS=1 NONINTERACTIVE=1 /tmp/devstation/bootstrap.sh",
      "rm -rf /tmp/devstation"
    ]
  }

  # Clean up for image
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -f /root/.ssh/authorized_keys",
      "sudo rm -f /home/ubuntu/.ssh/authorized_keys",
      "history -c"
    ]
  }
}
```

**Usage**:
```bash
# Navigate to packer directory
cd infra/devstation/packer

# Validate template
packer validate summit-devstation.pkr.hcl

# Build AMI (requires AWS credentials)
packer build summit-devstation.pkr.hcl

# Launch EC2 instance from AMI via AWS Console or CLI
```

### Cloud-Init (User Data)

**Location**: Create this file at `infra/devstation/cloud-init/summit-userdata.yaml`

```yaml
#cloud-config
# Summit Dev Station Cloud-Init
# Usage: Pass this as user-data when launching Ubuntu 22.04/24.04 VM

# Update and upgrade system
package_update: true
package_upgrade: true

# Install basic prerequisites
packages:
  - git
  - curl
  - wget

# Create summit user (optional - or use default ubuntu/admin user)
users:
  - name: developer
    groups: sudo, docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2E... # Add your SSH public key here

# Run bootstrap script on first boot
runcmd:
  # Clone repository (or download bootstrap script)
  - git clone https://github.com/YourOrg/summit.git /home/developer/summit || true
  - chown -R developer:developer /home/developer/summit

  # Run bootstrap with all features
  - |
    cd /home/developer/summit
    INSTALL_K8S_TOOLS=1 \
    INSTALL_CLOUD_TOOLS=1 \
    INSTALL_DESKTOP_APPS=0 \
    NONINTERACTIVE=1 \
    ./scripts/devstation/ubuntu/bootstrap.sh

  # Install Summit dependencies (as developer user)
  - sudo -u developer bash -c 'cd /home/developer/summit && pnpm install'
  - sudo -u developer bash -c 'cd /home/developer/summit && pnpm build'

  # Create marker file
  - touch /var/lib/cloud/instance/summit-bootstrap-complete

# Final message
final_message: |
  Summit Dev Station is ready!
  SSH in and run: cd ~/summit && pnpm test
  Bootstrap completed in $UPTIME seconds
```

**Usage**:

**AWS EC2**:
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.large \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --user-data file://infra/devstation/cloud-init/summit-userdata.yaml
```

**GCP Compute Engine**:
```bash
gcloud compute instances create summit-devstation \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-standard-4 \
  --metadata-from-file=user-data=infra/devstation/cloud-init/summit-userdata.yaml
```

**Azure VM**:
```bash
az vm create \
  --name summit-devstation \
  --image Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest \
  --size Standard_D4s_v3 \
  --custom-data ./infra/devstation/cloud-init/summit-userdata.yaml
```

## Security Considerations

### Secrets Management

**Do NOT** include secrets in:
- Packer templates
- Cloud-init user-data
- Container images

**Instead**:
1. Mount secrets at runtime (Kubernetes Secrets, AWS Secrets Manager, etc.)
2. Use IAM roles for cloud credentials (EC2 instance roles, GKE Workload Identity)
3. Prompt user for API keys on first use
4. Use environment variables passed securely

### SSH Keys

**Cloud-init**: Replace placeholder SSH key with your actual public key

**Packer**: Remove SSH authorized_keys in cleanup step (already included in template)

**Dev Containers**: Mount `~/.ssh` from host (already configured in template)

### Network Access

**Recommended**:
- Restrict SSH access via security groups (only your IP)
- Use VPN or bastion hosts for production environments
- Enable automatic security updates

## Cost Considerations

### Dev Container / Codespaces

- **Local**: Free (uses local Docker)
- **GitHub Codespaces**: ~$0.18/hour for 2-core machine

### Cloud VMs

- **AWS EC2 t3.large**: ~$0.08/hour (on-demand)
- **GCP e2-standard-4**: ~$0.13/hour
- **Azure Standard_D4s_v3**: ~$0.19/hour

**Tip**: Use spot/preemptible instances to save 60-90% (but can be terminated)

## Next Steps

1. **Choose approach**: Dev Container, Packer image, or Cloud-init
2. **Customize templates**: Add your SSH keys, adjust tool versions, etc.
3. **Test**: Validate on clean environment
4. **Document**: Add team-specific instructions to your internal wiki
5. **Automate**: Integrate into onboarding workflow

## Support

- **Dev Container issues**: VS Code Remote Containers documentation
- **Packer issues**: HashiCorp Packer documentation
- **Cloud-init issues**: Cloud provider documentation (AWS, GCP, Azure)
- **Bootstrap script issues**: See `docs/devstation/README.md`

## Future Enhancements

Ideas for future improvements:

- [ ] Multi-cloud Terraform module for VM provisioning
- [ ] Ansible playbook alternative to shell bootstrap
- [ ] Docker Compose file for local full-stack development
- [ ] Kubernetes pod template for ephemeral dev environments
- [ ] GitHub Actions workflow to build and publish Packer images
- [ ] Automated testing of bootstrap script (via GitHub Actions)

## License

Copyright (c) 2026 Your Organization. All rights reserved.
