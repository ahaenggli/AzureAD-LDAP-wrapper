FROM node:lts-alpine
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

RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

COPY package*.json ./

USER node

RUN npm install --production

RUN npm prune --production

COPY --chown=node:node . .

EXPOSE 13389

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js" ]