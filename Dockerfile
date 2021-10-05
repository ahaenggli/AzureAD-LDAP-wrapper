FROM node:lts-alpine as build

ENV NODE_ENV="production"

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY . .

USER node
RUN npm install --production && npm prune --production

FROM node:lts-alpine as final
RUN apk add --no-cache tini

ENV NODE_ENV="production"
ENV LDAP_DOMAIN="example.com"
ENV LDAP_BASEDN="dc=example,dc=com"
ENV LDAP_BINDUSER="username|password"
ENV LDAP_PORT="13389"
ENV LDAP_DEBUG="false"
ENV LDAP_ALLOWCACHEDLOGINONFAILURE="true"
ENV LDAP_SAMBANTPWD_MAXCACHETIME="-1"
ENV AZURE_APP_ID="*secret*"
ENV AZURE_TENANTID="*secret*"
ENV AZURE_APP_SECRET="*secret*"
ENV LDAP_SYNC_TIME="30"

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY --chown=node:node --from=build /app /app

USER node

EXPOSE 13389

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js" ]