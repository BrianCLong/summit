# PostgreSQL with WAL-G for Point-in-Time Recovery
# Provides continuous WAL archiving to S3 for RPO ≤ 5 minutes
# Includes pgvector and pg_partman

FROM pgvector/pgvector:pg16

# Install WAL-G dependencies and pg_partman
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    bash \
    awscli \
    lz4 \
    jq \
    postgresql-16-partman \
    && rm -rf /var/lib/apt/lists/*

# Install WAL-G
ENV WALG_VERSION=v3.0.0
RUN wget -q "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-ubuntu-20.04-amd64.tar.gz" -O /tmp/wal-g.tar.gz && \
    tar -xzf /tmp/wal-g.tar.gz -C /usr/local/bin && \
    rm /tmp/wal-g.tar.gz && \
    chmod +x /usr/local/bin/wal-g

# Copy WAL-G configuration and scripts
COPY config/walg.json /etc/wal-g.d/walg.json
COPY scripts/wal-archive.sh /usr/local/bin/wal-archive.sh
COPY scripts/wal-restore.sh /usr/local/bin/wal-restore.sh
COPY scripts/base-backup.sh /usr/local/bin/base-backup.sh
COPY scripts/pitr-restore.sh /usr/local/bin/pitr-restore.sh
COPY scripts/init-partman.sh /usr/local/bin/init-partman.sh

RUN chmod +x /usr/local/bin/wal-archive.sh \
    /usr/local/bin/wal-restore.sh \
    /usr/local/bin/base-backup.sh \
    /usr/local/bin/pitr-restore.sh \
    /usr/local/bin/init-partman.sh

# Configure PostgreSQL for PITR
COPY config/postgresql-pitr.conf /etc/postgresql/postgresql-pitr.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD pg_isready -U postgres || exit 1

LABEL maintainer="summit-platform@example.com" \
      description="PostgreSQL with WAL-G for Point-in-Time Recovery, pgvector, and pg_partman" \
      version="1.1.0"
