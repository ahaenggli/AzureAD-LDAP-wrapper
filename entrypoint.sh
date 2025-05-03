#!/bin/sh

set -e

# check UID for conflicts
EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
if [ -n "$EXISTING_USER" ] && [ "$EXISTING_USER" != "node" ]; then
    echo "Error: UID $PUID already used by internal user '$EXISTING_USER'"
    exit 1
fi

# check GID for conflicts
EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)
if [ -n "$EXISTING_GROUP" ] && [ "$EXISTING_GROUP" != "node" ]; then
    echo "Error: GID $PGID already used by internal group '$EXISTING_GROUP'"
    exit 1
fi

# change UID/GID if needed
if [ "$(id -u node)" != "$PUID" ]; then
    usermod -u "$PUID" node
fi

if [ "$(getent group node | cut -d: -f3)" != "$PGID" ]; then
    groupmod -g "$PGID" node
fi

mkdir -p /app/.cache 
chown -R "$PUID:$PGID" /home/node
chown -R "$PUID:$PGID" /app
chown -R "$PUID:$PGID" /app/.cache

node_path=$(which node)

if [[ "$LDAP_PORT" -gt "1024" ]]; then
  su_exec_cmd="su-exec node:node"
else
  su_exec_cmd="su-exec root:root"
fi

exec $su_exec_cmd /sbin/tini -s -- $node_path --openssl-legacy-provider index.js
