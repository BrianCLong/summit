# syntax=docker/dockerfile:1

ARG MAESTRO_VERSION=2.0.10

FROM debian:bookworm-slim AS base
ARG MAESTRO_VERSION
ENV MAESTRO_VERSION=${MAESTRO_VERSION}

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      openjdk-17-jre-headless \
      wget \
      unzip \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/maestro && \
    wget -q -O /tmp/${MAESTRO_VERSION} \
      "https://github.com/mobile-dev-inc/maestro/releases/download/cli-${MAESTRO_VERSION}/maestro.zip" && \
    unzip -q /tmp/${MAESTRO_VERSION} -d /opt/maestro && \
    rm /tmp/${MAESTRO_VERSION}

ENV PATH="/opt/maestro/bin:/opt/maestro/maestro/bin:${PATH}"
WORKDIR /workspace

FROM base AS ig
COPY packages/ig/ /workspace/packages/ig/
RUN mkdir -p /workspace/flows/ig && cp -R /workspace/packages/ig/flows/* /workspace/flows/ig/

FROM base AS mc
COPY packages/mc/ /workspace/packages/mc/
RUN mkdir -p /workspace/flows/mc && cp -R /workspace/packages/mc/flows/* /workspace/flows/mc/

FROM base AS sb
COPY packages/sb/ /workspace/packages/sb/
RUN mkdir -p /workspace/flows/sb && cp -R /workspace/packages/sb/flows/* /workspace/flows/sb/

FROM base AS co
COPY packages/co/ /workspace/packages/co/
RUN mkdir -p /workspace/flows/co && cp -R /workspace/packages/co/flows/* /workspace/flows/co/

FROM base AS summit-platform
COPY packages/ig/ /workspace/packages/ig/
COPY packages/mc/ /workspace/packages/mc/
COPY packages/sb/ /workspace/packages/sb/
COPY packages/co/ /workspace/packages/co/
COPY packages/summit-platform/ /workspace/packages/summit-platform/

RUN mkdir -p /workspace/flows/ig /workspace/flows/mc /workspace/flows/sb /workspace/flows/co && \
    cp -R /workspace/packages/ig/flows/* /workspace/flows/ig/ && \
    cp -R /workspace/packages/mc/flows/* /workspace/flows/mc/ && \
    cp -R /workspace/packages/sb/flows/* /workspace/flows/sb/ && \
    cp -R /workspace/packages/co/flows/* /workspace/flows/co/

ENTRYPOINT ["maestro", "mcp"]
