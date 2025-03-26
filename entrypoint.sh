#!/bin/sh

mkdir -p /app/.cache && chown -R node:node /app/.cache

node_path=$(which node)

if [[ "$LDAP_PORT" -gt "1024" ]]; then
  su_exec_cmd="su-exec node:node"
else
  su_exec_cmd="su-exec root:root"
fi

exec $su_exec_cmd /sbin/tini -s -- $node_path --openssl-legacy-provider index.js
