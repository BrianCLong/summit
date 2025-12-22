FROM python:3.12-alpine
RUN apk add --no-cache bash tini
WORKDIR /app
COPY services/stub_server_core.py /app/stub_server_core.py
COPY services/graphrag/stub_server.sh /app/stub_server.sh
ENV PORT=8080
ENV SERVICE_NAME=graphrag
ENV PYTHONUNBUFFERED=1
RUN chmod +x /app/stub_server.sh
EXPOSE $PORT
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/stub_server.sh"]
