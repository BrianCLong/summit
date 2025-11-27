# Dockerfile for the Summit Dev Container
FROM mcr.microsoft.com/devcontainers/typescript-node:18

# Install OS-level dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    python3-pip \
    python3-venv \
    postgresql-client \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set up a non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Switch to the non-root user
USER $USERNAME

# Set the working directory
WORKDIR /workspace

# Install pnpm globally
RUN npm install -g pnpm

# Copy project files and install dependencies
COPY --chown=node:node . .
RUN pnpm install

# Expose the application and debugging ports
EXPOSE 3000 4000 9229
