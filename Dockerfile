FROM node:lts-alpine as build

ENV NODE_ENV="production"

RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY . .

RUN npm install --production && npm prune --production

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
ENV DSM7 "true"
ENV GRAPH_FILTER_USERS "userType eq 'Member'"
ENV GRAPH_FILTER_GROUPS "securityEnabled eq true"
ENV GRAPH_IGNORE_MFA_ERRORS "false"

RUN mkdir -p /app && chown -R node:node /app
RUN mkdir -p /app/.cache  && chown -R node:node /app/.cache
RUN echo "This file was created by the dockerfile. It should not exist on a mapped volume." > /app/.cache/IshouldNotExist.txt 

WORKDIR /app
COPY --chown=node:node --from=build /app /app

EXPOSE 13389
RUN ["chmod", "+x", "/app/entrypoint.sh"]
ENTRYPOINT ["/app/entrypoint.sh"]