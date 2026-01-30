FROM alpine:latest
RUN apk add --no-cache postgresql-client redis bash
COPY backup.sh /scripts/backup.sh
COPY restore.sh /scripts/restore.sh
RUN chmod +x /scripts/*.sh
RUN echo '0 3 * * * /scripts/backup.sh' > /etc/crontabs/root
WORKDIR /scripts
CMD ["crond", "-f"]
