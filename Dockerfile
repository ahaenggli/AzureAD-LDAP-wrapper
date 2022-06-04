FROM node:lts-alpine as build

ENV NODE_ENV="production"

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY . .

USER root
RUN npm install --production && npm prune --production

USER node
FROM node:lts-alpine as final
RUN apk add --no-cache tini su-exec

ENV NODE_ENV "production"
ENV LDAP_DOMAIN "example.com"
ENV LDAP_BASEDN "dc=example,dc=com"
ENV LDAP_BINDUSER "username|password"
ENV LDAP_PORT "13389"
ENV LDAP_DEBUG "false"
ENV LDAP_ALLOWCACHEDLOGINONFAILURE "true"
ENV LDAP_SAMBANTPWD_MAXCACHETIME "-1"
ENV AZURE_APP_ID "*secret*"
ENV AZURE_TENANTID "*secret*"
ENV AZURE_APP_SECRET "*secret*"
ENV LDAP_SYNC_TIME "30"
ENV DSM7 "false"
ENV GRAPH_FILTER_USERS "userType eq 'Member'"
ENV GRAPH_FILTER_GROUPS ""

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY --chown=node:node --from=build /app /app

USER root
EXPOSE 13389
RUN ["chmod", "+x", "./entrypoint.sh"]
ENTRYPOINT ["./entrypoint.sh"]