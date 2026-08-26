#!/bin/sh
set -eu
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p /backups
pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "/backups/kjs-${stamp}.dump"
find /backups -type f -name 'kjs-*.dump' -mtime +30 -delete
echo "Created /backups/kjs-${stamp}.dump"
