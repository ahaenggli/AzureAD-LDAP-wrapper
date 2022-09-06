#!/bin/sh

mkdir -p /app/.cache 
chown -R node:node /app/.cache

x=$(which node)  

if [ "$LDAP_PORT" -gt "1024" ]
then
    su-exec node:node /sbin/tini -s -- $x server.js
else
    su-exec root:root /sbin/tini -s -- $x server.js
fi

