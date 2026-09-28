#!/bin/sh
# Fly volumes mount root-owned. Hand /data to the unprivileged app user, then drop root.
set -eu
mkdir -p /data
chown -R app:app /data
exec setpriv --reuid=app --regid=app --init-groups "$@"
