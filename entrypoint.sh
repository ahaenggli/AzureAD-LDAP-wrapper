#!/bin/sh

mkdir -p /app/.cache 
chown -R node:node /app/.cache
x=$(which node)  

su-exec node:node /sbin/tini -s -- $x server.js