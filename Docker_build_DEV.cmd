@echo off

REM dev
echo "Build DEV"
pause
docker build --no-cache -t ahaen/azuread-ldap-wrapper:dev .
pause

REM multiarch-dev
echo "Build DEV as multiarch"
pause
REM docker buildx build --no-cache --push -t ahaen/azuread-ldap-wrapper:dev --platform linux/amd64,linux/arm64/v8,linux/arm/v7  .
docker buildx build --no-cache --push -t ahaen/azuread-ldap-wrapper:tst --platform linux/arm64,linux/amd64,linux/s390x,linux/arm/v8,linux/arm/v7,linux/arm/v6 .
pause