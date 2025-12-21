FROM alpine:3.20
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY:-summit}" \
      org.opencontainers.image.description="Pilot hardened stage artifact"
RUN adduser -D pilot && \
    echo "Pilot hardened artifact" > /opt/pilot.txt
USER pilot
CMD ["cat", "/opt/pilot.txt"]
