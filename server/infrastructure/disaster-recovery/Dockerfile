FROM alpine:3.19
RUN apk add --no-cache postgresql16-client redis bash aws-cli coreutils tar gzip
COPY backup.sh /scripts/backup.sh
COPY restore.sh /scripts/restore.sh
COPY verify_backup.sh /scripts/verify_backup.sh
RUN chmod +x /scripts/*.sh
# Default schedule: Daily at 3 AM
RUN echo '0 3 * * * /scripts/backup.sh >> /backups/cron.log 2>&1' > /etc/crontabs/root
WORKDIR /scripts
CMD ["crond", "-f"]
