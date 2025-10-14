# IntelGraph Development Container
# Sprint 27A: Comprehensive development environment with all tools

FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=development

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    jq \
    vim \
    nano \
    htop \
    tree \
    zip \
    unzip \
    build-essential \
    python3 \
    python3-pip \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install additional CLI tools
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    pm2 \
    nx \
    @nestjs/cli \
    @angular/cli \
    create-next-app \
    prettier \
    eslint

# Install development tools via pip
RUN pip3 install \
    pre-commit \
    black \
    flake8 \
    mypy \
    pytest

# Install Docker CLI (for docker-in-docker)
RUN curl -fsSL https://get.docker.com | sh

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt update \
    && apt install gh -y

# Install yq for YAML processing
RUN wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
    && chmod +x /usr/local/bin/yq

# Install actionlint for GitHub Actions validation
RUN curl -fsSL https://raw.githubusercontent.com/rhymond/actionlint/main/scripts/download-actionlint.bash | bash \
    && mv actionlint /usr/local/bin/

# Install shellcheck for shell script linting
RUN apt-get update && apt-get install -y shellcheck && rm -rf /var/lib/apt/lists/*

# Install cosign for supply chain verification
RUN wget -O cosign https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
    && chmod +x cosign \
    && mv cosign /usr/local/bin/

# Install syft for SBOM generation
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Install grype for vulnerability scanning
RUN curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Install trivy for container scanning
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add - \
    && echo "deb https://aquasecurity.github.io/trivy-repo/deb generic main" | tee -a /etc/apt/sources.list.d/trivy.list \
    && apt-get update \
    && apt-get install -y trivy \
    && rm -rf /var/lib/apt/lists/*

# Install k6 for load testing
RUN wget -q -O - https://github.com/grafana/k6/releases/latest/download/k6-v0.47.0-linux-amd64.tar.gz | tar -xzf - --strip-components=1 -C /usr/local/bin k6-v0.47.0-linux-amd64/k6

# Install SLSA verifier
RUN wget -O slsa-verifier https://github.com/slsa-framework/slsa-verifier/releases/latest/download/slsa-verifier-linux-amd64 \
    && chmod +x slsa-verifier \
    && mv slsa-verifier /usr/local/bin/

# Install dive for Docker image analysis
RUN wget -O dive.deb https://github.com/wagoodman/dive/releases/latest/download/dive_0.11.0_linux_amd64.deb \
    && dpkg -i dive.deb \
    && rm dive.deb

# Install semantic-release for automated releases
RUN npm install -g \
    semantic-release \
    @semantic-release/changelog \
    @semantic-release/git \
    @semantic-release/github

# Create workspace directory
WORKDIR /workspace

# Switch to node user
USER node

# Configure git for the node user
RUN git config --global --add safe.directory /workspace \
    && git config --global init.defaultBranch main \
    && git config --global pull.rebase false

# Install global npm packages for the node user
RUN npm config set prefix ~/.npm-global \
    && echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Configure shell
RUN echo 'alias ll="ls -la"' >> ~/.bashrc \
    && echo 'alias la="ls -la"' >> ~/.bashrc \
    && echo 'alias ..="cd .."' >> ~/.bashrc \
    && echo 'alias ...="cd ../.."' >> ~/.bashrc \
    && echo 'export PS1="\[\e[32m\]\u@intelgraph-dev\[\e[m\]:\[\e[34m\]\w\[\e[m\]\$ "' >> ~/.bashrc

# Create common directories
RUN mkdir -p ~/.local/bin \
    && mkdir -p ~/.config \
    && mkdir -p ~/tmp

# Set default command
CMD ["sleep", "infinity"]
