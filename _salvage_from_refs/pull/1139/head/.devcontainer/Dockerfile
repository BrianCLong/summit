FROM mcr.microsoft.com/devcontainers/typescript-node:1-18-bullseye

# Install additional packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        git curl wget unzip vim jq postgresql-client \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g @turbo/cli typescript ts-node jest eslint prettier

WORKDIR /workspace
USER vscode
